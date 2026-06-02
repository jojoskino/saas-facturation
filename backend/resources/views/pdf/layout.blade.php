@php
    $docPrimary = $branding['primary'] ?? '#1e293b';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Times New Roman", Times, DejaVu Serif, serif;
            font-size: 12pt;
            color: #334155;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            background: #fff;
        }
        .doc-page {
            padding: 28px 32px 40px;
        }
        .doc-top {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .doc-top td {
            vertical-align: top;
            padding: 0;
            border: none;
        }
        .doc-logo {
            max-height: 56px;
            max-width: 200px;
            width: auto;
            height: auto;
            margin-bottom: 10px;
        }
        .doc-issuer-name {
            font-size: 12pt;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
        }
        .doc-issuer-meta {
            font-size: 10pt;
            color: #64748b;
            line-height: 1.5;
        }
        .doc-meta-box {
            text-align: right;
        }
        .doc-type {
            display: block;
            font-size: 10pt;
            font-weight: normal;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
        }
        .doc-number {
            font-size: 14pt;
            font-weight: bold;
            color: {{ $docPrimary }};
            margin: 0 0 8px;
        }
        .doc-meta-line {
            font-size: 10pt;
            color: #64748b;
            margin: 2px 0;
            line-height: 1.5;
        }
        .doc-meta-line strong {
            color: #475569;
            font-weight: 600;
        }
        .doc-rule {
            height: 1px;
            background: #e2e8f0;
            margin: 0 0 18px;
        }
        .doc-parties {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .doc-parties td {
            width: 50%;
            vertical-align: top;
            padding: 12px 14px;
            border: 1px solid #e8ecf1;
            background: #fafbfc;
        }
        .doc-parties td:first-child { border-right: none; }
        .doc-parties-label {
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #94a3b8;
            font-weight: 600;
            margin-bottom: 6px;
        }
        .doc-parties-name {
            font-size: 11pt;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
        }
        .doc-parties-body {
            font-size: 10pt;
            color: #64748b;
            line-height: 1.5;
        }
        .doc-lines {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 18px;
        }
        .doc-lines thead tr {
            border-bottom: 1px solid #94a3b8;
        }
        .doc-lines th {
            background: transparent;
            color: #64748b;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            padding: 0 6px 8px;
            text-align: left;
            font-weight: 600;
        }
        .doc-lines th.doc-col-num { text-align: right; }
        .doc-lines td {
            border-bottom: 1px solid #eef2f6;
            padding: 8px 6px;
            font-size: 11pt;
            color: #334155;
            line-height: 1.5;
        }
        .doc-lines td.doc-col-num {
            text-align: right;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
        }
        .doc-th-unit {
            display: block;
            margin-top: 2px;
            font-size: 8pt;
            font-weight: 600;
            letter-spacing: 0.04em;
            color: #94a3b8;
            text-transform: uppercase;
        }
        .doc-totals-wrap { width: 100%; margin-top: 6px; }
        .doc-totals-wrap td { border: none; padding: 0; }
        .doc-totals {
            width: 240px;
            margin-left: auto;
            border-collapse: collapse;
        }
        .doc-totals td {
            padding: 4px 0;
            font-size: 11pt;
            border: none;
            line-height: 1.5;
        }
        .doc-totals td:first-child { color: #64748b; }
        .doc-totals td:last-child {
            text-align: right;
            font-weight: 600;
            color: #334155;
        }
        .doc-totals tr.total td {
            padding-top: 8px;
            border-top: 1px solid #334155;
            font-size: 12pt;
            font-weight: bold;
            color: #1e293b;
        }
        .doc-totals tr.total td:last-child { color: {{ $docPrimary }}; }
        .doc-totals tr.highlight td {
            font-size: 10pt;
            color: #64748b;
        }
        .doc-totals tr.highlight td:last-child { font-weight: 600; color: #475569; }
        .doc-notes {
            margin-top: 18px;
            padding: 10px 12px;
            background: #fafbfc;
            border: 1px solid #e8ecf1;
            font-size: 10pt;
            color: #64748b;
            line-height: 1.5;
        }
        .doc-notes-title {
            font-weight: 600;
            color: #64748b;
            margin-bottom: 4px;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .doc-footer {
            margin-top: 22px;
            padding-top: 12px;
            border-top: 1px solid #e8ecf1;
            font-size: 9pt;
            color: #94a3b8;
            line-height: 1.5;
        }
        .doc-footer strong { color: #64748b; font-weight: 600; }
        .text-right { text-align: right; }
    </style>
</head>
<body>
    <div class="doc-page">
        @yield('content')
    </div>
</body>
</html>
