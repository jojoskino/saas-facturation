@php
    $docPrimary = $branding['primary'] ?? '#14213d';
    $docAccent = $branding['accent'] ?? '#fca311';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10.5px;
            color: {{ $docPrimary }};
            margin: 0;
            padding: 32px 36px 40px;
            line-height: 1.45;
        }
        .doc-accent {
            height: 4px;
            background: {{ $docAccent }};
            margin: -32px -36px 24px;
            width: calc(100% + 72px);
        }
        .doc-header {
            width: 100%;
            margin-bottom: 22px;
        }
        .doc-header td { vertical-align: top; padding: 0; border: none; }
        .doc-logo {
            max-height: 48px;
            max-width: 160px;
            margin-bottom: 8px;
        }
        .doc-brand {
            font-size: 22px;
            font-weight: bold;
            color: {{ $docPrimary }};
            letter-spacing: -0.5px;
            margin: 0 0 4px;
        }
        .doc-type {
            display: inline-block;
            background: {{ $docPrimary }};
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 5px 12px;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        .doc-meta { color: #5a6478; font-size: 10px; margin: 2px 0; }
        .doc-meta strong { color: {{ $docPrimary }}; }
        .doc-issuer {
            text-align: right;
            font-size: 10px;
            color: {{ $docPrimary }};
        }
        .doc-issuer-name { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
        .doc-parties {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .doc-parties td {
            width: 50%;
            vertical-align: top;
            padding: 12px 14px;
            border: 1px solid #e8ebf0;
            background: #f9fafc;
        }
        .doc-parties-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: {{ $docAccent }};
            font-weight: bold;
            margin-bottom: 6px;
        }
        .doc-lines {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 16px;
        }
        .doc-lines th {
            background: {{ $docPrimary }};
            color: #ffffff;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            padding: 9px 10px;
            text-align: left;
            font-weight: bold;
        }
        .doc-lines th.num { text-align: right; }
        .doc-lines td {
            border-bottom: 1px solid #e8ebf0;
            padding: 9px 10px;
            font-size: 10px;
        }
        .doc-lines td.num { text-align: right; white-space: nowrap; }
        .doc-lines tr:nth-child(even) td { background: #fafbfd; }
        .doc-totals-wrap { width: 100%; margin-top: 4px; }
        .doc-totals-wrap td { border: none; padding: 0; }
        .doc-totals {
            width: 280px;
            margin-left: auto;
            border-collapse: collapse;
        }
        .doc-totals td {
            padding: 6px 12px;
            font-size: 10px;
            border: none;
        }
        .doc-totals td:last-child { text-align: right; font-weight: 600; }
        .doc-totals tr.sub td { color: #5a6478; }
        .doc-totals tr.total td {
            background: {{ $docPrimary }};
            color: #ffffff;
            font-size: 12px;
            font-weight: bold;
            padding: 10px 12px;
        }
        .doc-totals tr.highlight td {
            color: {{ $docPrimary }};
            font-weight: bold;
            border-top: 2px solid {{ $docAccent }};
        }
        .doc-notes {
            margin-top: 18px;
            padding: 12px 14px;
            background: #fff9ed;
            border-left: 3px solid {{ $docAccent }};
            font-size: 10px;
        }
        .doc-notes-title { font-weight: bold; margin-bottom: 4px; }
        .doc-footer {
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid #e8ebf0;
            font-size: 9px;
            color: #6b7280;
        }
        .doc-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            background: #eef2ff;
            color: {{ $docPrimary }};
        }
        .text-right { text-align: right; }
    </style>
</head>
<body>
    <div class="doc-accent"></div>
    @yield('content')
</body>
</html>
