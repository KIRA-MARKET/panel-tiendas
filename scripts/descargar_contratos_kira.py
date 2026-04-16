#!/usr/bin/env python3
# =============================================================
#  KIRA MARKET S.L. — Descarga contratos de Gmail a iCloud
#  Todos los archivos van a una carpeta temporal para revisión
#  Uso: python3 descargar_contratos_kira.py
# =============================================================

import os, sys, base64, re

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
except ImportError:
    print("\n❌ Faltan librerías. Ejecuta primero:")
    print("source ~/nominas_env/bin/activate")
    print("pip3 install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════
#  CONFIGURACIÓN
# ══════════════════════════════════════════════════════════════

CREDENTIALS_JSON = "/Users/nacho/Desktop/COSAS PARA COWORK/credenciales/credentials.json"
TOKEN_JSON       = "/Users/nacho/Desktop/COSAS PARA COWORK/credenciales/token_gmail.json"
ICLOUD_BASE      = "/Users/nacho/Library/Mobile Documents/com~apple~CloudDocs"
SCOPES           = ['https://www.googleapis.com/auth/gmail.readonly']

# Carpeta temporal donde se descargan TODOS los archivos
CARPETA_DESCARGA = os.path.join(ICLOUD_BASE, "KIRA MARKET S.L.", "Contratos KIRA - Revisar")

# IDs de emails con contratos de empleados activos
EMAILS_CONTRATOS = [
    "1839d884c14609ca",  # CONTRATO VANESA CALVO
    "17c0736efd3f248c",  # CONTRATO SILVIA CARRASCO
    "17d60fe203ab57ad",  # CONTRATO SILVIA CARRASCO + CERTIFICADO ELISABETH
    "1858158b2812e8c1",  # ALTA ABDESSAMAD
    "1942bcbc4a243b21",  # TRANSFORMACION INDEFINIDO ABDESSAMAD
    "193101b4108be443",  # CONTRATO ANTONIO ALFREDO FABRIS
    "17a66d4753f7308f",  # MODIFICACION LETICIA GARCIA
    "1977d02509d7c371",  # CONTRATO-HC ANDRES GOMEZ
    "19bf9f788fb613ab",  # CONTRATO ANDRES GOMEZ ENE 2026
    "18b2843a02a3bba6",  # MODIFICACION EDUARDO LABELLA
    "19518bd4405605bb",  # ALTA EDUARDO LABELLA
    "17ff3e28b3c88777",  # MODIFICACION EVA MOLINERO
    "17aae91901635804",  # MODIFICACION IRENE MOLINERO
    "1815bffeaa03b9fa",  # CONTRATO ANTONIO MORILLA
    "1830d5388d4b4bad",  # PRORROGA ANTONIO MORILLA
    "18442501e8021608",  # MODIFICACION ANTONIO QUESADA
    "17be88b2d65b740c",  # MODIFICACION SARA RIVERA
    "1969f9fd3d2452ed",  # CONTRATO ALEX VERA
    "183b23b9c46e8ed8",  # TRANSFORMACION MORILLA + MODIFICACION ALEJANDRO + SILVIA
    "1925622235d33df3",  # MODIFICACION DAVID + LETICIA + EDUARDO
    "188b449d8fdf70b3",  # MODIFICACION HORARIOS VARIOS
    "17f91c641fc9952a",  # MODIFICACION CONTRATOS VARIOS
    "17f8d7e16f7736fd",  # CONTRATOS ALEJANDRO RUIZ Y SILVIA CARRASCO
    "17f91c8827b93531",  # HORAS COMPLEMENTARIAS
]

# ══════════════════════════════════════════════════════════════

def autenticar_gmail():
    creds = None
    if os.path.exists(TOKEN_JSON):
        creds = Credentials.from_authorized_user_file(TOKEN_JSON, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_JSON, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_JSON, 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)

def nombre_limpio(filename):
    return re.sub(r'[<>:"/\\|?*]', '_', filename)

def obtener_partes(payload):
    partes = []
    if 'parts' in payload:
        for parte in payload['parts']:
            partes.extend(obtener_partes(parte))
    else:
        partes.append(payload)
    return partes

def descargar_email(service, msg_id, carpeta):
    try:
        mensaje = service.users().messages().get(
            userId='me', id=msg_id, format='full').execute()

        asunto = next((h['value'] for h in mensaje['payload']['headers']
                      if h['name'] == 'Subject'), 'Sin asunto')
        print(f"\n📧 {asunto}")

        todas_partes = obtener_partes(mensaje['payload'])
        total = 0

        for parte in todas_partes:
            filename = parte.get('filename', '')
            if not filename:
                continue
            if not any(filename.lower().endswith(ext) for ext in ['.pdf', '.doc', '.docx']):
                continue

            body = parte.get('body', {})
            attachment_id = body.get('attachmentId')
            data = body.get('data', '')

            if attachment_id:
                adjunto = service.users().messages().attachments().get(
                    userId='me', messageId=msg_id, id=attachment_id).execute()
                data = adjunto.get('data', '')

            if not data:
                continue

            pdf_bytes = base64.urlsafe_b64decode(data + '==')
            filepath = os.path.join(carpeta, nombre_limpio(filename))

            if os.path.exists(filepath):
                print(f"  ⚠️  Ya existe: {filename}")
                continue

            with open(filepath, 'wb') as f:
                f.write(pdf_bytes)
            print(f"  ✅ {filename}")
            total += 1

        if total == 0:
            print(f"  ℹ️  Sin adjuntos PDF/DOC nuevos")

        return total

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return 0

# ══════════════════════════════════════════════════════════════
#  EJECUCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  KIRA MARKET S.L. — Descarga contratos a iCloud Drive")
    print("="*55)

    if not os.path.exists(CREDENTIALS_JSON):
        print(f"\n❌ No encuentro credentials.json en COSAS PARA COWORK")
        sys.exit(1)

    # Crear carpeta temporal
    os.makedirs(CARPETA_DESCARGA, exist_ok=True)
    print(f"\n📁 Carpeta de descarga:")
    print(f"   iCloud Drive → KIRA MARKET S.L. → Contratos KIRA - Revisar")

    print("\n🔐 Autenticando con Gmail...")
    try:
        service = autenticar_gmail()
        print("✅ Autenticación correcta")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    total_archivos = 0
    for msg_id in EMAILS_CONTRATOS:
        n = descargar_email(service, msg_id, CARPETA_DESCARGA)
        total_archivos += n

    print(f"\n{'='*55}")
    print(f"  ✅ COMPLETADO")
    print(f"  Archivos descargados: {total_archivos}")
    print(f"  Revísalos en:")
    print(f"  iCloud Drive → KIRA MARKET S.L. → Contratos KIRA - Revisar")
    print(f"\n  Desde ahí muévelos a la carpeta de cada empleado.")
    print(f"{'='*55}\n")
