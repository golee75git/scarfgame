$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$buildTools = Join-Path $sdk "build-tools\35.0.0"
$androidJar = Join-Path $sdk "platforms\android-35\android.jar"
$work = Join-Path $PSScriptRoot "build"
$assets = Join-Path $work "assets"
$classes = Join-Path $work "classes"
$keystore = Join-Path $work "scarf.keystore"
$unsigned = Join-Path $work "unsigned.apk"
$aligned = Join-Path $work "aligned.apk"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$apk = Join-Path $root "scarf-$stamp.apk"

if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Path $assets, $classes | Out-Null
Copy-Item (Join-Path $root "index.html") $assets
Copy-Item (Join-Path $root "css") (Join-Path $assets "css") -Recurse
Copy-Item (Join-Path $root "js") (Join-Path $assets "js") -Recurse
if (Test-Path (Join-Path $root "images")) {
  Copy-Item (Join-Path $root "images") (Join-Path $assets "images") -Recurse
}
if (Test-Path (Join-Path $root "scarf_img")) {
  Copy-Item (Join-Path $root "scarf_img") (Join-Path $assets "scarf_img") -Recurse
}
if (Test-Path (Join-Path $root "fonts")) {
  Copy-Item (Join-Path $root "fonts") (Join-Path $assets "fonts") -Recurse
}
$clip = Join-Path $root "sound\1.wav"
if (Test-Path $clip) {
  $soundDir = Join-Path $assets "sound"
  New-Item -ItemType Directory -Path $soundDir | Out-Null
  Copy-Item $clip (Join-Path $soundDir "1.wav")
}

$markDir = Join-Path $work "res\drawable"
$compiled = Join-Path $work "compiled"
New-Item -ItemType Directory -Path $markDir, $compiled | Out-Null
Copy-Item (Join-Path $root "icon.png") (Join-Path $markDir "scarf_mark.png")
& (Join-Path $buildTools "aapt2.exe") compile --dir (Join-Path $work "res") -o (Join-Path $compiled "res.zip")

& (Join-Path $buildTools "aapt2.exe") link `
  -o $unsigned `
  -I $androidJar `
  --manifest (Join-Path $PSScriptRoot "AndroidManifest.xml") `
  -R (Join-Path $compiled "res.zip") `
  --min-sdk-version 24 `
  --target-sdk-version 35

javac --release 17 -encoding UTF-8 -classpath $androidJar -d $classes (Join-Path $PSScriptRoot "src\local\scarf\challenge\MainActivity.java")
$classFiles = @(Get-ChildItem $classes -Recurse -Filter *.class | ForEach-Object { $_.FullName })
& (Join-Path $buildTools "d8.bat") --lib $androidJar --min-api 24 --output $work @classFiles
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

python -c @"
import os, zipfile
apk = r'$unsigned'
root = r'$assets'
with zipfile.ZipFile(apk, 'a') as z:
    z.write(os.path.join(r'$work', 'classes.dex'), 'classes.dex')
    for dirpath, _, names in os.walk(root):
        for name in names:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace('\\', '/')
            z.write(full, 'assets/' + rel)
"@

& (Join-Path $buildTools "zipalign.exe") -f 4 $unsigned $aligned

if (-not (Test-Path $keystore)) {
  keytool -genkeypair -keystore $keystore -storepass scarf-local -keypass scarf-local -alias scarf -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Scarf Challenge, O=Local, C=KR"
}

& (Join-Path $buildTools "apksigner.bat") sign --ks $keystore --ks-pass pass:scarf-local --key-pass pass:scarf-local --out $apk $aligned
& (Join-Path $buildTools "apksigner.bat") verify --verbose $apk
Write-Host "APK $apk"
