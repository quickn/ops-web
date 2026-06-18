# sync_to_server.ps1
# 同步项目到远程服务器并重启Docker容器

$SERVER = "park@192.168.10.11"
# SERVER = "park@101.37.104.12"
$REMOTE_DIR = "/home/park/web/m-web"
# 获取当前脚本所在目录的父目录（项目根目录）
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$SOURCE_DIR = "${PROJECT_ROOT}\dist"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting sync to server..." -ForegroundColor Cyan
Write-Host "Server: $SERVER" -ForegroundColor Cyan
Write-Host "Remote Dir: $REMOTE_DIR" -ForegroundColor Cyan
Write-Host "Source Dir: $SOURCE_DIR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 检查项目根目录是否存在
if (-Not (Test-Path $PROJECT_ROOT))
{
  Write-Host "ERROR: Project root not found: $PROJECT_ROOT" -ForegroundColor Red
  exit 1
}
Write-Host "OK: Project root exists: $PROJECT_ROOT" -ForegroundColor Green

# 2. 清空远程目录内容或创建目录
Write-Host "Preparing remote directory..." -ForegroundColor Yellow
# 先检查远程目录是否存在，不存在则创建
ssh $SERVER "mkdir -p $REMOTE_DIR"
if ($LASTEXITCODE -eq 0)
{
  Write-Host "OK: Remote directory exists or created: $REMOTE_DIR" -ForegroundColor Green
}
else
{
  Write-Host "ERROR: Failed to create remote directory: $REMOTE_DIR" -ForegroundColor Red
  exit 1
}

# 清空远程目录内容（保留目录本身）
Write-Host "Clearing remote files contents..." -ForegroundColor Yellow
ssh $SERVER "find $REMOTE_DIR -mindepth 1 -type f -delete"
if ($LASTEXITCODE -eq 0)
{
  Write-Host "OK: Remote directory cleared" -ForegroundColor Green
}
else
{
  Write-Host "WARNING: Failed to clear remote directory" -ForegroundColor Yellow
}

# 4. 构建项目
# 执行构建
Write-Host "Running pnpm build..." -ForegroundColor Yellow
pnpm run build

# 5. 使用 rsync 同步文件（如果可用）或使用 scp
Write-Host "Syncing files to server..." -ForegroundColor Yellow

# 尝试使用 rsync
$rsyncAvailable = Get-Command rsync -ErrorAction SilentlyContinue

Write-Host "scp -o StrictHostKeyChecking=no -r ${SOURCE_DIR}\ ${SERVER}:${REMOTE_DIR}/ " -ForegroundColor Green

if ($rsyncAvailable)
{
  # 构建 rsync 命令
  $RSYNC_CMD = "rsync -avz --delete"

  $RSYNC_CMD += " -e ssh"
  $RSYNC_CMD += " `"$PROJECT_ROOT/`""
  $RSYNC_CMD += " `"$SERVER`:$REMOTE_DIR/`""

  Write-Host "Using rsync for sync..." -ForegroundColor Yellow
  Invoke-Expression $RSYNC_CMD

  if ($LASTEXITCODE -ne 0)
  {
    Write-Host "ERROR: rsync failed, falling back to scp..." -ForegroundColor Red
    # 如果 rsync 失败，使用 scp 备选方案
  Write-Host "Transferring files via scp (this may take a while)..." -ForegroundColor Yellow
  # 注意：scp -r 会将整个 dist 目录复制到远程，形成 m-web/dist/
  # 如需直接复制 dist 内容到 m-web/，需要先清空远程目录
  scp -o StrictHostKeyChecking=no -r "$SOURCE_DIR\*" "${SERVER}:${REMOTE_DIR}/"
  }
}
else
{
  Write-Host "rsync not available, using scp..." -ForegroundColor Yellow
  Write-Host "Transferring files to server..." -ForegroundColor Yellow
  # 直接使用 scp 传输，然后远程删除忽略的目录和 .pyc 文件
  Write-Host "Transferring files to server (this may take a while)..." -ForegroundColor Yellow
  # 使用通配符复制 dist 目录下所有内容到远程目录根路径
  # scp -o StrictHostKeyChecking=no -r D:\Users\liuyun\IdeaProjects\monitor-web\dist\* park@101.37.104.12:/home/park/web/m-web/
  scp -o StrictHostKeyChecking=no -r "${SOURCE_DIR}\*" "${SERVER}:${REMOTE_DIR}/"
}

Write-Host "OK: Files transferred successfully" -ForegroundColor Green
