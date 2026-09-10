# sync_to_server.ps1
# 同步项目到远程服务器并重启Docker容器

$SERVER = "park@192.168.10.11"
#$SERVER = "park@101.37.104.12"
$REMOTE_DIR = "/home/park/web/m-web"
$TEMP_DIR = "$REMOTE_DIR.tmp"
# 获取当前脚本所在目录的父目录（项目根目录）
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$SOURCE_DIR = "${PROJECT_ROOT}\dist"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting sync to server..." -ForegroundColor Cyan
Write-Host "Server: $SERVER" -ForegroundColor Cyan
Write-Host "Remote Dir: $REMOTE_DIR" -ForegroundColor Cyan
Write-Host "Temp Dir: $TEMP_DIR" -ForegroundColor Cyan
Write-Host "Source Dir: $SOURCE_DIR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 检查项目根目录是否存在
if (-Not (Test-Path $PROJECT_ROOT))
{
  Write-Host "ERROR: Project root not found: $PROJECT_ROOT" -ForegroundColor Red
  exit 1
}
Write-Host "OK: Project root exists: $PROJECT_ROOT" -ForegroundColor Green

# 2. 准备临时目录（先删除旧临时目录，再创建空临时目录）
Write-Host "Preparing temporary directory..." -ForegroundColor Yellow
ssh $SERVER "rm -rf $TEMP_DIR && mkdir -p $TEMP_DIR"
if ($LASTEXITCODE -eq 0)
{
  Write-Host "OK: Temporary directory ready: $TEMP_DIR" -ForegroundColor Green
}
else
{
  Write-Host "ERROR: Failed to prepare temporary directory: $TEMP_DIR" -ForegroundColor Red
  exit 1
}

# 确保正式目录存在（不存在则创建）
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

# 4. 构建项目
# 执行构建
Write-Host "Running pnpm build..." -ForegroundColor Yellow
pnpm run build

# 5. 使用 rsync 同步文件（如果可用）或使用 scp（同步到临时目录）
Write-Host "Syncing files to temporary directory..." -ForegroundColor Yellow

# 尝试使用 rsync
$rsyncAvailable = Get-Command rsync -ErrorAction SilentlyContinue

if ($rsyncAvailable)
{
  # 构建 rsync 命令（使用正斜杠路径，rsync 的源目录为 dist 内容）
  $RSYNC_CMD = "rsync -avz --delete"

  $RSYNC_CMD += " -e ssh"
  $RSYNC_CMD += " `"$($SOURCE_DIR -replace '\\','/')/`""
  $RSYNC_CMD += " `"$SERVER`:$TEMP_DIR/`""

  Write-Host "Using rsync for sync..." -ForegroundColor Yellow
  Invoke-Expression $RSYNC_CMD

  if ($LASTEXITCODE -ne 0)
  {
    Write-Host "ERROR: rsync failed, falling back to scp..." -ForegroundColor Red
    # 如果 rsync 失败，使用 scp 备选方案
    Write-Host "Transferring files via scp (this may take a while)..." -ForegroundColor Yellow
    Push-Location $SOURCE_DIR
    scp -o StrictHostKeyChecking=no -r . "${SERVER}:${TEMP_DIR}/"
    Pop-Location
  }
}
else
{
  Write-Host "rsync not available, using scp..." -ForegroundColor Yellow
  Write-Host "Transferring files to temporary directory..." -ForegroundColor Yellow
  # 进入 dist 目录，使用相对路径 "." 递归拷贝所有内容（含 assets 子目录）
  Push-Location $SOURCE_DIR
  scp -o StrictHostKeyChecking=no -r . "${SERVER}:${TEMP_DIR}/"
  Pop-Location
}

Write-Host "OK: Files transferred to temporary directory" -ForegroundColor Green

# 6. 切换目录：删除正式目录内容，将临时目录内容拷贝到正式目录
Write-Host "Switching directories..." -ForegroundColor Yellow
$SWITCH_CMD = "rm -rf $REMOTE_DIR/* $REMOTE_DIR/.[!.]* $REMOTE_DIR/..?* && cp -rf $TEMP_DIR/* $TEMP_DIR/.[!.]* $TEMP_DIR/..?* $REMOTE_DIR/ 2>/dev/null; rm -rf $TEMP_DIR"
ssh $SERVER $SWITCH_CMD
if ($LASTEXITCODE -eq 0)
{
  Write-Host "OK: Directory switched successfully" -ForegroundColor Green
}
else
{
  Write-Host "ERROR: Failed to switch directories" -ForegroundColor Red
  exit 1
}

Write-Host "OK: Deployment completed" -ForegroundColor Green
