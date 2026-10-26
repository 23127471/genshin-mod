# Breezi Launcher - PowerShell Native Engine for Windows
# Chay truc tiep tren moi may Windows 10/11 khong can cai dat bat ky phan mem nao

$port = 4879
$baseDir = $PSScriptRoot
$libDir = Join-Path $baseDir "lib"
$breeziExe = Join-Path $libDir "breezi.exe"
$breeziJson = Join-Path $libDir "breezi.json"
$configFile = Join-Path $baseDir "config.ini"

function Read-LauncherConfig {
    $cfg = @{
        "GamePath" = ""
        "ServerUrl" = "https://genshin-mod.vercel.app"
        "AutoMinimize" = "true"
        "BackgroundImage" = "https://raw.githubusercontent.com/Zeal-L/Honkai-Star-Rail-Wallpaper/main/Offcial/1313143.jpg"
        "BackgroundVideo" = "https://raw.githubusercontent.com/adiambassador/wallpapers/main/honkai/march-7th-honkai-star-rail-adventure.1920x1080.mp4"
        "EventVideo" = "hutao.mp4"
        "LauncherTitle" = "Genshin Impact Mod x Tấn Cutos 1.0.2"
        "BrandTitle" = "IMPACT"
        "BrandSubtitle" = "MAY THIS JOURNEY LEAD US STARWARD"
        "BadgeText" = "MOD x TẤN CUTOS"
        "UseLoadLibrary" = "false"
    }
    if (Test-Path $configFile) {
        Get-Content $configFile -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith(";") -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $parts = $line.Split("=", 2)
                $cfg[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }
    return $cfg
}

function Save-LauncherConfig($newValues) {
    $cfg = Read-LauncherConfig
    foreach ($k in $newValues.Keys) {
        $cfg[$k] = $newValues[$k]
    }
    $lines = @(
        "; ==============================================================================",
        "; Breezi Launcher Configuration x Tấn Cutos",
        "; ==============================================================================",
        "",
        "; Đường dẫn tệp thực thi game",
        "GamePath=" + $cfg["GamePath"],
        "",
        "; Địa chỉ máy chủ xác thực và cập nhật",
        "ServerUrl=" + $cfg["ServerUrl"],
        "",
        "; Tự động thu nhỏ launcher khi bấm Play",
        "AutoMinimize=" + $cfg["AutoMinimize"],
        "",
        "; Ảnh và video nền",
        "BackgroundImage=" + $cfg["BackgroundImage"],
        "BackgroundVideo=" + $cfg["BackgroundVideo"],
        "EventVideo=" + $cfg["EventVideo"],
        "",
        "; Thông tin thương hiệu",
        "LauncherTitle=" + $cfg["LauncherTitle"],
        "BrandTitle=" + $cfg["BrandTitle"],
        "BrandSubtitle=" + $cfg["BrandSubtitle"],
        "BadgeText=" + $cfg["BadgeText"],
        "UseLoadLibrary=" + $cfg["UseLoadLibrary"]
    )
    $lines | Set-Content $configFile -Encoding UTF8

    # Sync lib/breezi.json
    $jsonObj = @{
        "target_path" = $cfg["GamePath"]
        "use_loadlibrary" = ($cfg["UseLoadLibrary"] -eq "true")
    }
    $jsonObj | ConvertTo-Json | Set-Content $breeziJson -Encoding UTF8
    return $cfg
}

# Start HTTP server
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
} catch {
    # Port dang ban, thu mo luon
}

$url = "http://localhost:$port/"

# Mo Edge / Chrome o che do Desktop App Window
$edgeOpened = $false
try {
    Start-Process "msedge.exe" -ArgumentList "--app=`"$url`" --window-size=1280,720" -ErrorAction Stop
    $edgeOpened = $true
} catch {
    try {
        Start-Process "chrome.exe" -ArgumentList "--app=`"$url`" --window-size=1280,720" -ErrorAction Stop
        $edgeOpened = $true
    } catch {
        Start-Process $url
    }
}

# Vong lap xu ly request
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    $res.Headers.Add("Access-Control-Allow-Origin", "*")

    $path = $req.Url.AbsolutePath

    if ($path -eq "/" -or $path -eq "/index.html") {
        $content = [System.IO.File]::ReadAllBytes((Join-Path $baseDir "index.html"))
        $res.ContentType = "text/html; charset=utf-8"
        $res.OutputStream.Write($content, 0, $content.Length)
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "GET" -and $path -eq "/api/config") {
        $cfg = Read-LauncherConfig
        $jsonStr = $cfg | ConvertTo-Json
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
        $res.ContentType = "application/json"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "GET" -and $path -eq "/api/browse") {
        Add-Type -AssemblyName System.Windows.Forms
        $dlg = New-Object System.Windows.Forms.OpenFileDialog
        $dlg.Filter = "Tệp game (*.exe)|*.exe|Tất cả tệp (*.*)|*.*"
        $dlg.Title = "Chọn tệp thực thi Game (GenshinImpact.exe)"
        $selectedPath = ""
        if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            $selectedPath = $dlg.FileName
        }
        $resp = @{ "path" = $selectedPath } | ConvertTo-Json
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
        $res.ContentType = "application/json"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "POST" -and $path -eq "/api/save-config") {
        $reader = New-Object System.IO.StreamReader($req.InputStream)
        $body = $reader.ReadToEnd()
        $data = $body | ConvertFrom-Json
        $hash = @{}
        $data.psobject.properties | ForEach-Object { $hash[$_.Name] = [string]$_.Value }
        $saved = Save-LauncherConfig $hash
        $resp = @{ "success" = $true; "config" = $saved } | ConvertTo-Json
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
        $res.ContentType = "application/json"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "POST" -and $path -eq "/api/launch") {
        $cfg = Read-LauncherConfig
        $gamePath = $cfg["GamePath"]
        if (-not $gamePath) {
            $resp = @{ "success" = $false; "message" = "Chưa cấu hình đường dẫn game! Vui lòng nhấn vào biểu tượng bánh răng ⚙ để chọn tệp game." } | ConvertTo-Json
        } elseif (-not (Test-Path $breeziExe)) {
            $resp = @{ "success" = $false; "message" = "Không tìm thấy tệp $breeziExe" } | ConvertTo-Json
        } else {
            Start-Process -FilePath $breeziExe -WorkingDirectory $libDir
            $resp = @{ "success" = $true; "message" = "Khởi chạy Breezi Injector thành công! Game đang được nạp..." } | ConvertTo-Json
        }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
        $res.ContentType = "application/json"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
    }

    if ($req.HttpMethod -eq "POST" -and $path -eq "/api/download-update") {
        $cfg = Read-LauncherConfig
        $serverUrl = $cfg["ServerUrl"].TrimEnd('/')
        $files = @("breezi.dll", "breezi.exe")
        $err = $null
        foreach ($f in $files) {
            try {
                $targetFile = Join-Path $libDir $f
                Invoke-WebRequest -Uri "$serverUrl/api/download?file=$f" -OutFile $targetFile
            } catch {
                $err = $_.Exception.Message
            }
        }
        if ($err) {
            $resp = @{ "success" = $false; "message" = "Lỗi tải cập nhật: $err" } | ConvertTo-Json
        } else {
            $resp = @{ "success" = $true; "message" = "Đã tải và cập nhật thành công bản mới nhất!" } | ConvertTo-Json
        }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
        $res.ContentType = "application/json"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
    }

    # Static file serving (CSS, JS, Video, Images)
    $localFile = Join-Path $baseDir $path.TrimStart('/')
    if (Test-Path $localFile -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
        switch ($ext) {
            ".css"  { $res.ContentType = "text/css" }
            ".js"   { $res.ContentType = "application/javascript" }
            ".png"  { $res.ContentType = "image/png" }
            ".ico"  { $res.ContentType = "image/x-icon" }
            ".mp4"  { $res.ContentType = "video/mp4" }
            ".json" { $res.ContentType = "application/json" }
            Default { $res.ContentType = "application/octet-stream" }
        }
        $bytes = [System.IO.File]::ReadAllBytes($localFile)
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        continue
    }

    $res.StatusCode = 404
    $res.Close()
}
