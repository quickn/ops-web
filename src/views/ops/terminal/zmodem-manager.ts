/**
 * ZMODEM 文件传输管理器
 *
 * 集成 zmodem.js 与 xterm.js + WebSocket，实现终端内的 sz(下载) / rz(上传)。
 *
 * 设计要点：
 * - 上传使用 abort() 结束会话，确保 Sentry 同步恢复透传模式
 * - 64KB 分块上传，支持 200MB+ 大文件
 * - 下载使用动态分块存储，避免大文件 OOM
 * - 支持随时取消上传
 */

import { ElMessage } from "element-plus";
// @ts-ignore - zmodem.js is CJS module
import Zmodem from "zmodem.js";

interface ZmodemConfig {
  /** 将数据写入 xterm 终端 */
  writeToTerminal: (data: Uint8Array) => void;
  /** 通过 WebSocket 将数据发送给远端 */
  sendToSocket: (data: Uint8Array) => void;
  /** 获取 WebSocket 缓冲队列大小 */
  getBufferedAmount?: () => number;
  /** 传输完成回调 */
  onTransferComplete?: () => void;
  /** 进度回调 (percentage, fileName, received, total, isUpload) */
  onProgress?: (
    pct: number,
    name: string,
    received: number,
    total: number,
    isUpload: boolean
  ) => void;
}

export function createZmodemManager(config: ZmodemManager) {
  const { writeToTerminal, sendToSocket, getBufferedAmount, onTransferComplete, onProgress } =
    config;

  let sentry: any = null;
  let session: any = null;
  let uploadCancelled = false;

  // ==================== 工具函数 ====================

  /** 浏览器下载 Blob */
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

  /** 格式化字节数为可读字符串 */
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }

  /** 终止会话并清理状态 */
  function abortSession(sess: any) {
    if (!sess) return;
    try {
      sess.abort();
    } catch (_) {
      // abort() 同步清理 _zsession
    }

    if (session === sess) {
      session = null;
      onTransferComplete?.();
    }
  }

  // ==================== sz 下载（远端 → 浏览器） ====================

  function handleReceiveFile(xfer: any, details: any) {
    const name = details?.name || "download";
    const size = details?.size || 0;

    const chunks: Uint8Array[] = [];
    let received = 0;
    let lastProgressTime = 0;

    xfer.on("input", (payload: Uint8Array) => {
      chunks.push(new Uint8Array(payload));
      received += payload.length;

      // 节流进度回调
      if (onProgress && size > 0) {
        const now = Date.now();
        const pct = Math.min(Math.round((received / size) * 100), 100);
        if (pct >= 100 || now - lastProgressTime >= 200) {
          lastProgressTime = now;
          onProgress(pct, name, received, size, false);
        }
      }
    });

    xfer.on("complete", () => {
      try {
        const blob = new Blob(chunks);
        saveToDisk(blob, name);
        ElMessage.success(`下载完成: ${name} (${formatBytes(received)})`);
        onProgress?.(100, name, received, size, false);
      } catch (e: any) {
        ElMessage.error("文件保存失败: " + (e?.message || e));
      }
    });

    xfer.accept().catch((e: any) => {
      console.error("ZMODEM receive error:", e);
      ElMessage.error("ZMODEM 接收失败");
    });
  }

  // ==================== rz 上传（浏览器 → 远端） ====================

  /** 构建批量上传信息 */
  function buildBatch(files: File[]) {
    const total = files.reduce((s, f) => s + f.size, 0);
    let remaining = total;
    return files.map((f, i) => {
      remaining -= f.size;
      return {
        file: f,
        filesRemaining: files.length - i, // zmodem.js 要求 ≥1
        bytesRemaining: remaining + f.size, // 包含当前文件
      };
    });
  }

  /** 上传单个文件 */
  function uploadFile(
    sess: any,
    file: File,
    filesRemaining: number,
    bytesRemaining: number
  ): Promise<void> {
    const CHUNK_SIZE = 64 * 1024; // 64KB
    const MAX_BUFFER_SIZE = 512 * 1024; // 512KB 最大缓冲（降低阈值）
    // 是否为最后一个文件（filesRemaining=1 表示当前文件是最后一个）
    const isLast = filesRemaining <= 1;
  
    const info = {
      name: file.name,
      size: file.size,
      mtime: new Date(file.lastModified),
      files_remaining: filesRemaining,
      bytes_remaining: bytesRemaining,
    };
  
    return sess.send_offer(info).then((xfer: any) => {
      if (!xfer) return Promise.resolve();
      if (uploadCancelled) return Promise.reject(new Error("已取消"));
  
      return new Promise<void>((resolve, reject) => {
        let offset = 0;
  
        function pump() {
          if (uploadCancelled) {
            reject(new Error("已取消"));
            return;
          }
  
          if (offset >= file.size) {
            // 所有数据已读取完毕，等待 WebSocket 缓冲区清空
            const checkBufferEmpty = () => {
              const buffered = getBufferedAmount?.() || 0;
              if (buffered > 0) {
                // 更新进度：总大小 - 缓冲区剩余 = 已发送
                const actualSent = file.size - buffered;
                if (onProgress && file.size > 0) {
                  const pct = Math.round((actualSent / file.size) * 100);
                  // 确保进度不超过99%，直到真正完成
                  onProgress(Math.min(pct, 99), file.name, actualSent, file.size, true);
                }
                // 等待缓冲区清空
                setTimeout(checkBufferEmpty, 50);
              } else {
                // 缓冲区已清空，发送100%进度，然后结束会话
                if (onProgress && file.size > 0) {
                  onProgress(100, file.name, file.size, file.size, true);
                }
                // 添加一点延迟确保UI更新完成
                setTimeout(() => {
                  finishUpload();
                }, 100);
              }
            };
            checkBufferEmpty();
            return;
          }
  
          // 检查 WebSocket 缓冲区大小，避免积压过多数据
          const buffered = getBufferedAmount?.() || 0;
          if (buffered > MAX_BUFFER_SIZE) {
            // 更新进度：显示实际已发送的量
            const actualSent = offset - buffered;
            if (onProgress && file.size > 0) {
              const pct = Math.min(Math.round((actualSent / file.size) * 100), 99);
              onProgress(pct, file.name, Math.max(0, actualSent), file.size, true);
            }
            // 缓冲区过大，延迟发送
            setTimeout(pump, 100);
            return;
          }
  
          const end = Math.min(offset + CHUNK_SIZE, file.size);
          const reader = new FileReader();
  
          reader.onload = () => {
            try {
              xfer.send(new Uint8Array(reader.result as ArrayBuffer));
            } catch (e) {
              reject(e);
              return;
            }
            offset = end;
  
            // 继续发送下一块
            setTimeout(pump, 0);
          };
          reader.onerror = () => reject(new Error("文件读取失败"));
          reader.readAsArrayBuffer(file.slice(offset, end));
        }

        function finishUpload() {
          if (isLast) {
            // 最后一个文件：发送 ZEOF 后立即 resolve，不等待远端确认。
            try {
              xfer.end();
              resolve();
            } catch (e) {
              console.error('Error ending transfer:', e);
              reject(e);
            }
          } else {
            // 非最后一个文件：正常等待远端 ZEOF 确认
            xfer.end().then(() => {
              resolve();
            }).catch(reject);
          }
        }
  
        pump();
      });
    });
  }

  /** 打开文件选择器并上传 */
  function startUpload(sendSession: any) {
    uploadCancelled = false;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);

    let picked = false;

    input.onchange = async () => {
      picked = true;
      try {
        const files = input.files;
        if (!files || files.length === 0) {
          abortSession(sendSession);
          return;
        }

        const fileList = Array.from(files);
        const totalSize = fileList.reduce((s, f) => s + f.size, 0);
        ElMessage.info(
          `开始上传 ${fileList.length} 个文件 (${formatBytes(totalSize)})...`
        );

        const batch = buildBatch(fileList);

        for (const { file, filesRemaining, bytesRemaining } of batch) {
          if (uploadCancelled) break;
          await uploadFile(sendSession, file, filesRemaining, bytesRemaining);
          if (!uploadCancelled) {
            ElMessage.success(`${file.name} 上传完成`);
          }
        }
      } catch (e: any) {
        if (e?.message !== "已取消") {
          ElMessage.error("上传失败: " + (e?.message || "未知错误"));
        }
      } finally {
        document.body.removeChild(input);
        if (!uploadCancelled) {
          abortSession(sendSession);
        }
      }
    };

    // 检测用户取消文件选择器
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      setTimeout(() => {
        if (!picked) {
          document.body.removeChild(input);
          abortSession(sendSession);
          ElMessage.warning("已取消上传");
        }
      }, 300);
    };
    window.addEventListener("focus", onFocus);

    input.click();
  }

  // ==================== Sentry 管理 ====================

  function createSentry() {
    if (sentry) return;

    sentry = new Zmodem.Sentry({
      sender(octets: number[]) {
        sendToSocket(new Uint8Array(octets));
      },
      to_terminal(octets: number[]) {
        writeToTerminal(new Uint8Array(octets));
      },
      on_detect(detection: any) {
        session = detection.confirm();

        if (session.type === "receive") {
          // sz: 远端发送文件到浏览器
          session.on("offer", (xfer: any) => {
            handleReceiveFile(xfer, xfer.get_details());
          });
          try {
            session.start();
          } catch (_) {}
        } else if (session.type === "send") {
          // rz: 浏览器发送文件到远端
          try {
            session.start();
          } catch (_) {}
          setTimeout(() => startUpload(session), 0);
        }
      },
      on_retract() {
        if (session && !sentry?.get_confirmed_session()) {
          session = null;
        }
      },
    });
  }

  // ==================== 公共接口 ====================

  /** 处理 WebSocket 入站数据 */
  function processIncoming(rawData: string | ArrayBuffer) {
    if (!sentry) createSentry();

    let bytes: Uint8Array;
    if (typeof rawData === "string") {
      bytes = new TextEncoder().encode(rawData);
    } else {
      bytes = new Uint8Array(rawData);
    }

    try {
      sentry.consume([...bytes]);
    } catch (e: any) {
      console.warn("ZMODEM consume error:", e.message || e);
    }

    // 检测会话自然结束（如 sz 下载完成）
    const cur = sentry.get_confirmed_session();
    if (!cur && session) {
      session = null;
      onTransferComplete?.();
    }
  }

  /** 取消当前上传 */
  function cancelUpload() {
    if (session) {
      uploadCancelled = true;
      abortSession(session);
    }
  }

  /** 销毁（断开连接时调用） */
  function destroy() {
    if (session) {
      try {
        session.abort();
      } catch (_) {}
      session = null;
    }
    sentry = null;
    uploadCancelled = false;
  }

  return { processIncoming, destroy, cancelUpload };
}
