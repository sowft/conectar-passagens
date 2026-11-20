$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectDir '.env.local'
$content = if (Test-Path -LiteralPath $envPath) { [IO.File]::ReadAllText($envPath) } else { '' }

function Read-PrivateValue([string]$Label) {
    $secureValue = Read-Host $Label -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
function Set-Setting([string]$Key, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    if ($Value.Contains("'") -or $Value.Contains([char]10) -or $Value.Contains([char]13)) {
        throw 'Use um valor em uma linha e sem aspas simples.'
    }
    # Next expands dollar signs even in quoted values; escape them for dotenv-expand.
    $encodedValue = $Value.Replace('$', '\$')
    $line = $Key + "='" + $encodedValue + "'"
    $pattern = '(?m)^' + [regex]::Escape($Key) + '=.*\r?$'
    if ([regex]::IsMatch($script:content, $pattern)) {
        $script:content = [regex]::Replace($script:content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line }.GetNewClosure())
    } else { $script:content += "`n" + $line + "`n" }
}
function New-Secret {
    $bytes = New-Object byte[] 32
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}
Write-Host 'Configuracao local da Conectar Passagens'
Write-Host 'Pressione Enter para manter qualquer valor ja configurado. Chaves nao serao exibidas.'
$publicAppUrl = Read-Host 'Endereco publico HTTPS da aplicacao (pode deixar para depois)'
if ($publicAppUrl) {
    $parsedPublicUrl = $null
    if (![Uri]::TryCreate($publicAppUrl, [UriKind]::Absolute, [ref]$parsedPublicUrl) -or $parsedPublicUrl.Scheme -ne 'https') { throw 'Informe um endereco publico HTTPS valido.' }
    Set-Setting 'PUBLIC_APP_URL' $publicAppUrl
}
$url = Read-Host 'URL do projeto Supabase (https://...supabase.co)'
if ($url) {
    $parsedUrl = $null
    if (![Uri]::TryCreate($url, [UriKind]::Absolute, [ref]$parsedUrl) -or $parsedUrl.Scheme -ne 'https') { throw 'Informe uma URL HTTPS valida.' }
    Set-Setting 'NEXT_PUBLIC_SUPABASE_URL' $url
}
$key = Read-PrivateValue 'Chave SECRET do Supabase (sb_secret_...; service_role legado tambem aceito)'
Set-Setting 'SUPABASE_SECRET_KEY' $key
$password = Read-PrivateValue 'Escolha a senha administrativa (minimo 12 caracteres)'
if ($password -and $password.Length -lt 12) { throw 'A senha deve ter pelo menos 12 caracteres. Nada foi salvo.' }
if ($password) { $content = [regex]::Replace($content, '(?m)^ADMIN_PASSWORD_HASH=.*\r?$', '') }
Set-Setting 'ADMIN_PASSWORD' $password
$googleKey = Read-PrivateValue 'Chave da Google Places API (pode deixar para depois)'
Set-Setting 'GOOGLE_PLACES_API_KEY' $googleKey
if ($content -notmatch '(?m)^SESSION_SECRET=.+$') { Set-Setting 'SESSION_SECRET' (New-Secret) }
if ($content -notmatch '(?m)^LEAD_INGEST_TOKEN=.+$') { Set-Setting 'LEAD_INGEST_TOKEN' (New-Secret) }
[IO.File]::WriteAllText($envPath, $content, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Configuracao salva em .env.local. Reinicie o app e execute npm run diagnostico.'
Write-Host 'Se ainda nao aplicou a migracao, execute supabase-leads.sql no SQL Editor do Supabase.'
