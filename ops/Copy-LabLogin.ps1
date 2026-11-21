param(
    [Parameter(Mandatory)]
    [ValidateSet('local', 'cloud')]
    [string]$Environment,

    [ValidateSet('admin', 'staff-minh', 'staff-linh', 'staff-anh', 'customer')]
    [string]$Account = 'admin',

    [ValidateSet('email', 'password')]
    [string]$Field = 'password'
)

$vault = Join-Path $env:LOCALAPPDATA 'LAB-Resource-Manager/Access'
$path = Join-Path $vault "$Environment-$Account.clixml"
if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "LAB login has not been saved for $Environment/$Account on this Windows account."
}

$credential = Import-Clixml -LiteralPath $path
if ($Field -eq 'email') {
    Set-Clipboard -Value $credential.UserName
} else {
    Set-Clipboard -Value $credential.GetNetworkCredential().Password
}

Write-Output "Copied $Field for $Environment/$Account."
