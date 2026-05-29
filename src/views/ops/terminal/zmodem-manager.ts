/**
 * ZMODEM 集成管理器
 *
 * 集成 zmodem.js 与 xterm.js + WebSocket，
 * 实现终端内的 ZMODEM 文件上传/下载（rz/sz）。
 *
 * 设计要点：
 * - Sentry 由 processIncoming 按需懒加载创建，贯穿整个 WebSocket 连接生命周期
 * - 传输完成后不重建 Sentry，由 Sentry 内置的 session_end 机制自动恢复透传模式
 * - 避免销毁/重建 Sentry 导致残留 ZMODEM 协议数据被误判为新会话
 */

import { ElMessage } from "element-plus";
// @ts-ignore - zmodem.js is CJS module
import Zmodem from "zmodem.js";

interface ZmodemConfig {
  /** 将数据写入 xterm 终端 */
  writeToTerminal: (data: Uint8Array) => void;
  /** 通过 WebSocket 将数据发送给远端 */
  sendToSocket: (data: Uint8Array) => void;
  /** 传输完成回调（session 级别，整个 ZMODEM 会话结束时触发） */
  onTransferComplete?: () => void;
  /** 下载进度回调 (percentage, fileName, received, total) */
  onProgress?: (
    pct: number,
    name: string,
    received: number,
    total: number
  ) => void;
}

export function createZmodemManager(config: ZmodemConfig) {
  const { writeToTerminal, sendToSocket, onTransferComplete, onProgress } =
    config;

  let sentry: any = null;
  let session: any = null;

  /** 浏览器下载 Blob 到本地磁盘 */
  function saveToDisk(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.style.display = "none";
    el.href = url;
    el.download = name;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(url);
  }

  /**
   * 接收文件：使用 "input"/"complete" 事件流式收集
   * 优化：预分配缓冲区 + 节流进度回调
   */
  function saveReceivedFile(xfer: any, details: any) {
    const name = details?.name || "download";
    const size = details?.size || 0;

    // 对超大文件（如 > 500MB）退回动态模式，避免 OOM
    const MAX_PREALLOC = 500 * 1024 * 1024;
    let buffer: Uint8Array;
    let receivedBytes = 0;

    if (size > 0 && size <= MAX_PREALLOC) {
      try {
        buffer = new Uint8Array(size);
      } catch {
        buffer = new Uint8Array(0);
      }
    } else {
      buffer = new Uint8Array(0);
    }

    const dynamicChunks: Uint8Array[] = [];
    const usePreAllocated = buffer.byteLength > 0;

    // 节流：最多每 200ms 回调一次进度
    let lastProgressTime = 0;
    let lastPct = 0;

    function throttleProgress(force = false) {
      if (!onProgress || size === 0) return;
      const now = Date.now();
      const pct = Math.min(Math.round((receivedBytes / size) * 100), 100);
      if (force || pct !== lastPct || now - lastProgressTime >= 200) {
        lastProgressTime = now;
        lastPct = pct;
        onProgress(pct, name, receivedBytes, size);
      }
    }

    // 每收到一个数据块
    xfer.on("input", (payload: Uint8Array) => {
      if (
        usePreAllocated &&
        receivedBytes + payload.length <= buffer.byteLength
      ) {
        buffer.set(payload, receivedBytes);
      } else {
        dynamicChunks.push(new Uint8Array(payload));
      }
      receivedBytes += payload.length;
      throttleProgress();
    });

    // 单个文件接收完成
    xfer.on("complete", () => {
      try {
        let blob: Blob;
        if (usePreAllocated && receivedBytes === buffer.byteLength) {
          blob = new Blob([buffer]);
        } else if (usePreAllocated && receivedBytes < buffer.byteLength) {
          blob = new Blob([buffer.subarray(0, receivedBytes)]);
        } else {
          blob = new Blob(dynamicChunks);
        }
        saveToDisk(blob, name);
        ElMessage.success(`文件接收完成: ${name}`);
      } catch (e: any) {
        ElMessage.error("文件保存失败: " + (e?.message || e));
      } finally {
        throttleProgress(true);
        // 单个文件完成时不重置 sentry/session
        // ZMODEM 会话级别的结束由 processIncoming 检测 session_end 统一处理
      }
    });

    // 开始接收
    xfer.accept().catch((e: any) => {
      console.error("ZMODEM receive error:", e);
      ElMessage.error("ZMODEM 接收失败: " + (e?.message || e));
    });
  }

  /**
   * 计算 batch info：files_remaining / bytes_remaining 表示
   * "包括当前文件在内，还剩多少文件/字节"
   */
  function buildFileBatch(fileList: File[]) {
    const totalBytes = fileList.reduce((sum, f) => sum + f.size, 0);
    let bytesRemaining = totalBytes;
    return fileList
      .map((f) => {
        const br = bytesRemaining;
        bytesRemaining -= f.size;
        return { file: f, bytesRemaining: br };
      })
      .map((item, i, arr) => ({
        ...item,
        filesRemaining: arr.length - i,
      }));
  }

  /** 发送单个文件（分块读取，避免一次性加载大文件到内存） */
  function sendSingleFile(
    sendSession: any,
    file: File,
    filesRemaining: number,
    bytesRemaining: number
  ): Promise<void> {
    const CHUNK_SIZE = 32 * 1024; // 32KB 分块
    const fileInfo = {
      name: file.name,
      size: file.size,
      mtime: new Date(file.lastModified),
      files_remaining: filesRemaining,
      bytes_remaining: bytesRemaining,
    };

    return sendSession.send_offer(fileInfo).then((xfer: any) => {
      if (!xfer) return; // 被远端跳过

      return new Promise<void>((resolve, reject) => {
        let offset = 0;

        // 分块发送：每次读取 CHUNK_SIZE，用 send() 逐块发送，最后 end()
        function sendNextChunk() {
          if (offset >= file.size) {
            // 所有数据已发送，结束传输
            xfer.end().then(resolve).catch(reject);
            return;
          }

          const end = Math.min(offset + CHUNK_SIZE, file.size);
          const slice = file.slice(offset, end);

          const chunkReader = new FileReader();
          chunkReader.onload = () => {
            const data = new Uint8Array(chunkReader.result as ArrayBuffer);
            try {
              xfer.send(data);
            } catch (e: any) {
              reject(e);
              return;
            }
            offset = end;

            // 节流进度
            if (onProgress && file.size > 0) {
              const pct = Math.round((offset / file.size) * 100);
              onProgress(pct, file.name, offset, file.size);
            }

            // 让出主线程，避免阻塞 UI
            setTimeout(sendNextChunk, 0);
          };
          chunkReader.onerror = () => reject(new Error("文件读取失败"));
          chunkReader.readAsArrayBuffer(slice);
        }

        sendNextChunk();
      });
    });
  }

  /**
   * 安全关闭 ZMODEM 会话：先尝试 close()，失败则 abort() 强制终止。
   *
   * close() 路径：发送 ZFIN 握手，session_end 在收到远端 ZFIN 后由
   *   processIncoming 检测并触发 onTransferComplete。
   *
   * abort() 路径：发送 CAN 序列，_on_session_end() 同步清理 _zsession，
   *   但 processIncoming 只有在下一条 WS 消息到达时才会检测到会话结束。
   *   为避免 onTransferComplete 延迟/丢失，abort 后显式触发。
   */
  function safeCloseSession(sess: any) {
    try {
      sess.close();
      // close() 成功（ZFIN 已发出），会话将在收到远端 ZFIN 后自然结束
      // processIncoming 届时会检测到并调用 onTransferComplete
      return;
    } catch (e: any) {
      console.warn(
        "ZMODEM close() failed, falling back to abort():",
        e?.message || e
      );
    }

    // close() 失败，使用 abort() 强制终止
    try {
      sess.abort();
    } catch (_) {
      // abort() 通常不抛异常
    }

    // abort() 已同步触发 _on_session_end → _zsession 已清空
    // 但 processIncoming 不会立即执行，需要显式通知完成
    if (session) {
      session = null;
      onTransferComplete?.();
    }
  }

  /** 发送文件：打开文件选择器 → 通过 ZMODEM 协议发送 */
  function sendFilesFromPicker(sendSession: any) {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      // 无论是否选择文件，都在 finally 中清理 input
      try {
        if (!input.files || input.files.length === 0) {
          return;
        }

        const fileList = Array.from(input.files);
        ElMessage.info(`正在发送 ${fileList.length} 个文件...`);

        const batch = buildFileBatch(fileList);

        for (const { file, filesRemaining, bytesRemaining } of batch) {
          await sendSingleFile(
            sendSession,
            file,
            filesRemaining,
            bytesRemaining
          );
          ElMessage.success(`${file.name} 发送完成`);
        }
      } catch (e: any) {
        ElMessage.error("文件发送失败: " + (e?.message || e));
      } finally {
        document.body.removeChild(input);
        // 在所有 UI 消息之后立即关闭会话，减少竞态窗口
        // close() 失败时自动降级为 abort() 兜底
        safeCloseSession(sendSession);
      }
    };

    input.click();
  }

  /** 创建 Sentry（懒加载，仅当检测到 ZMODEM 数据时才创建） */
  function createSentry() {
    if (sentry) return; // 避免重复创建

    sentry = new Zmodem.Sentry({
      sender(octets: number[]) {
        sendToSocket(new Uint8Array(octets));
      },
      to_terminal(octets: number[]) {
        writeToTerminal(new Uint8Array(octets));
      },
      on_detect(detection: any) {
        // 自动确认 ZMODEM 检测
        session = detection.confirm();

        if (session.type === "receive") {
          // 远端执行 sz（浏览器接收文件）
          session.on("offer", (xfer: any) => {
            const details = xfer.get_details();
            saveReceivedFile(xfer, details);
          });
          try {
            session.start();
          } catch (_) {
            // session.start() 可能抛异常但实际不影响
          }
        } else if (session.type === "send") {
          // 远端执行 rz（浏览器发送文件到远端）
          try {
            session.start();
          } catch (_) {
            // session.start() 可能抛异常但实际不影响
          }
          // 异步弹出文件选择器，不阻塞 on_detect 回调
          setTimeout(() => sendFilesFromPicker(session), 0);
        }
      },
      on_retract() {
        // ZMODEM 检测被撤销（非 ZMODEM 数据），清理会话引用
        if (session && !sentry?.get_confirmed_session()) {
          session = null;
        }
      },
    });
  }

  /** 处理来自 WebSocket 的入站数据，交由 Sentry 解析 */
  function processIncoming(rawData: string | ArrayBuffer) {
    if (!sentry) {
      createSentry();
    }

    let bytes: Uint8Array;
    if (typeof rawData === "string") {
      bytes = new TextEncoder().encode(rawData);
    } else {
      bytes = new Uint8Array(rawData);
    }

    try {
      // zmodem.js consume() 需要 number[]
      // 使用扩展运算符比 Array.from() 快 ~30%
      sentry.consume([...bytes]);
    } catch (e: any) {
      console.warn("ZMODEM sentry consume error:", e.message || e);
    }

    // 检测 ZMODEM 会话是否已自然结束
    // Sentry 内部通过 session_end 事件自动清理 _zsession
    const currentSession = sentry.get_confirmed_session();
    if (!currentSession && session) {
      session = null;
      onTransferComplete?.();
    }
  }

  /** 销毁，清理 Sentry（仅在断开连接时调用） */
  function destroy() {
    if (session) {
      try {
        session.close();
      } catch (_) {
        // 忽略关闭错误
      }
    }
    sentry = null;
    session = null;
  }

  return { processIncoming, destroy };
}
