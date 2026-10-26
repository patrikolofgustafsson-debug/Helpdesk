$port = 5016
$basePath = $PSScriptRoot
$db_tickets = Join-Path $basePath "tickets.json"
$db_kb = Join-Path $basePath "kb.json"

function Get-DbContent($fileName) {
    $path = Join-Path $basePath $fileName
    if (!(Test-Path $path)) { "[]" | Out-File $path -Encoding utf8 }
    return Get-Content $path -Raw -Encoding utf8
}

$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$port/")
$l.Start()

Write-Host "--- SERVER STARTAD PÅ http://localhost:$port ---" -Fore Green

while ($l.IsListening) {
    try {
        $ctx = $l.GetContext(); $req = $ctx.Request; $res = $ctx.Response
        $url = $req.Url.LocalPath.TrimEnd("/")
        
        # --- 1. API: SPARA/UPPDATERA ÄRENDE (TICKETS) ---
        if ($url -eq "/api/create" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $data = Get-DbContent "tickets.json" | ConvertFrom-Json
            $list = [System.Collections.ArrayList]@($data)

            if ($null -ne $body.id) {
                # Uppdatera befintligt
                $toRemove = $list | Where-Object { $_.id -eq $body.id }
                if ($null -ne $toRemove) { foreach($item in $toRemove) { $list.Remove($item) } }
                $null = $list.Add($body)
                Write-Host "Uppdaterar ärende: $($body.id)" -Fore Cyan
            } else {
                # NYTT ÄRENDE (Använder PSObject för att undvika 'property not found' fel)
                $newTicket = New-Object PSObject -Property @{
                    id       = Get-Random -Min 1000 -Max 9999
                    title    = $body.title
                    customer = $body.customer
                    service  = $body.service
                    desc     = $body.desc
                    status   = "Open"
                    created  = (Get-Date).ToString("yyyy-MM-dd HH:mm")
                    replies  = @()
                    image    = $body.image
                    fileName = $body.fileName
                }
                $null = $list.Add($newTicket)
                Write-Host "Skapar nytt ärende för: $($body.customer)" -Fore Green
            }
            $list | ConvertTo-Json -Depth 10 | Out-File $db_tickets -Encoding utf8
            $res.StatusCode = 200
            $res.OutputStream.Write([System.Text.Encoding]::UTF8.GetBytes("OK"), 0, 2)
        }

        # --- 2. API: SPARA/UPPDATERA AGENT ---
        elseif ($url -eq "/api/agents/create" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $data = Get-DbContent "agents.json" | ConvertFrom-Json
            $list = [System.Collections.ArrayList]@($data)
            
            if ($null -ne $body.id -and $body.id -ne "") {
                $toRemove = $list | Where-Object { $_.id -eq $body.id }
                if ($null -ne $toRemove) { foreach($item in $toRemove) { $list.Remove($item) } }
                Write-Host "Uppdaterar agent: $($body.name)" -Fore Cyan
            } else { 
                $body.id = (Get-Date).Ticks.ToString() 
                Write-Host "Skapar ny agent: $($body.name)" -Fore Green
            }
            $null = $list.Add($body)
            $list | ConvertTo-Json -Depth 10 | Out-File (Join-Path $basePath "agents.json") -Encoding utf8
            $res.StatusCode = 200
            $res.OutputStream.Write([System.Text.Encoding]::UTF8.GetBytes("OK"), 0, 2)
        }

        # --- 3. API: RADERA AGENT ---
        elseif ($url -eq "/api/agents/delete" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $data = Get-DbContent "agents.json" | ConvertFrom-Json
            $list = [System.Collections.ArrayList]@($data)
            $toRemove = $list | Where-Object { [string]$_.id -eq [string]$body.id }
            if ($null -ne $toRemove) { foreach($item in $toRemove) { $list.Remove($item) } }
            $list | ConvertTo-Json -Depth 10 | Out-File (Join-Path $basePath "agents.json") -Encoding utf8
            $res.StatusCode = 200
            $res.OutputStream.Write([System.Text.Encoding]::UTF8.GetBytes("OK"), 0, 2)
        }

        # --- 4. API: SPARA/UPPDATERA KB ---
        elseif ($url -eq "/api/kb/create" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $data = Get-DbContent "kb.json" | ConvertFrom-Json
            $list = [System.Collections.ArrayList]@($data)
            if ($null -ne $body.id) {
                $toRemove = $list | Where-Object { $_.id -eq $body.id }
                if ($null -ne $toRemove) { foreach($item in $toRemove) { $list.Remove($item) } }
            } else { $body.id = (Get-Date).Ticks.ToString() }
            $null = $list.Add($body)
            $list | ConvertTo-Json -Depth 10 | Out-File $db_kb -Encoding utf8
            $res.StatusCode = 200
            $res.OutputStream.Write([System.Text.Encoding]::UTF8.GetBytes("OK"), 0, 2)
        }

        # --- 5. GENERELLA HÄMTNINGS-ANROP ---
        elseif ($url.StartsWith("/api/")) {
            $type = $url.Split("/")[-1]
            $json = switch($type) {
                "tickets"   { Get-DbContent "tickets.json" }
                "kb"        { Get-DbContent "kb.json" }
                "customers" { Get-DbContent "customers.json" }
                "agents"    { Get-DbContent "agents.json" }
                default     { "[]" }
            }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType = "application/json"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } 

        # --- 6. FILSERVER ---
        else {
            $fileName = if ($url -eq "" -or $url -eq "/") { "login.html" } else { $url.TrimStart("/") }
            if ($fileName -notlike "*.*") { $fileName += ".html" }
            $filePath = Join-Path $basePath $fileName
            if (Test-Path $filePath) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $res.ContentType = if($fileName.EndsWith(".js")){"application/javascript"}else{"text/html; charset=utf-8"}
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else { $res.StatusCode = 404 }
        }
        $res.Close()
    } catch {
        Write-Host "FEL: $($_.Exception.Message)" -Fore Red
        if ($null -ne $res) { $res.Close() }
    }
}