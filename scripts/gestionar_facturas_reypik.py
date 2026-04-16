#!/usr/bin/env python3
# =============================================================
#  REYPIK MARKET S.L. — Gestión automática de facturas
#  Uso: python3 gestionar_facturas_reypik.py
# =============================================================

import os, sys, base64, re
from datetime import datetime, date
from email.utils import parsedate_to_datetime

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

CREDENTIALS_JSON = "/Users/nacho/Desktop/COSAS PARA COWORK/credenciales/credentials_reypik.json"
TOKEN_JSON       = "/Users/nacho/Desktop/COSAS PARA COWORK/credenciales/token_reypik_gmail.json"
ICLOUD_BASE      = "/Users/nacho/Library/Mobile Documents/com~apple~CloudDocs"
EMPRESA_CARPETA  = "REYPIK MARKET S.L."
SCOPES           = ['https://www.googleapis.com/auth/gmail.readonly']

# Alberto Serrano → solo SS y listado costes
ALBERTO_SERRANO = "alsemar@crgconsultores.es"
ALBERTO_DOCS_SI = ["seguros sociales", "listado costes", "listado de costes"]
ALBERTO_DOCS_NO = [
    "certificado", "retencion", "retenciones",
    "alta", "contrato", "baja", "finiquito", "regularizacion",
    "documento", "inaplicacion", "transformacion", "modificacion",
    "prorroga", "horas complementarias", "incentivos",
]
ALBERTO_NOMINAS = [
    "nominas", "nóminas", "nomina febrero", "nomina enero",
    "nomina marzo", "nomina abril", "nomina mayo", "nomina junio",
    "nomina julio", "nomina agosto", "nomina septiembre",
    "nomina octubre", "nomina noviembre", "nomina diciembre"
]

# Palabras clave para detectar facturas
PALABRAS_ASUNTO = [
    "factura", "invoice", "fra.", "fra ", "facture",
    "receipt", "recibo", "extracto", "liquidacion",
    "tu factura", "su factura", "facturación", "facturacion",
    "billing", "your receipt", "nueva factura", "factura disponible",
    "disponible tu factura", "ya tienes disponible",
    "atm report"
]

# Proveedores SIN adjunto → van al informe manual
PROVEEDORES_SIN_ADJUNTO = {
    "info.empresas@email.telefonica.es": "Telefónica",
    "vodafone@corp.vodafone.es": "Vodafone",
    "news@micuenta.makro.es": "Makro",
    "noreply@emasagra.es": "EMASAGRA (Agua)",
    "no-reply@mercedes-benz.com": "Mercedes Finance (factura disponible en app)",
    "comunicaciones@energyavm.es": "VM Energía (factura disponible en web)",
}

# Remitentes a IGNORAR completamente
IGNORAR_REMITENTES = [
    "expresscatolica@gmail.com",             # emails enviados por nosotros
    "expressgranvia@gmail.com",              # emails de KIRA
    "no-reply@app.meters.es",
    "estherchamosa@60dias.es",
    "cloudplatform-noreply@google.com",
    "noreply@email.mercedes-benz.com",       # suscripción personal Mercedes
    "cristian@moranteasesores.es",
    "franquicias@moranteasesores.es",
    "getpaid.europe@ecolab.com",             # aviso de pago vencido, no factura
]

# ══════════════════════════════════════════════════════════════

def autenticar_gmail():
    """Autenticación OAuth2 con el Gmail de REYPIK."""
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

def pedir_fechas():
    print("\n📅 PERÍODO DE BÚSQUEDA")
    print("─" * 40)
    while True:
        fecha_ini_str = input("   Fecha inicio (DD/MM/AAAA): ").strip()
        try:
            d_ini = datetime.strptime(fecha_ini_str, "%d/%m/%Y")
            break
        except:
            print("   ❌ Formato incorrecto. Usa DD/MM/AAAA")

    hoy = date.today()
    print(f"   Fecha fin (Enter = hoy {hoy.strftime('%d/%m/%Y')}): ", end="")
    fecha_fin_str = input().strip()
    if not fecha_fin_str:
        d_fin = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)
    else:
        try:
            d_fin = datetime.strptime(fecha_fin_str, "%d/%m/%Y")
            d_fin = d_fin.replace(hour=23, minute=59, second=59)
        except:
            d_fin = datetime(hoy.year, hoy.month, hoy.day, 23, 59, 59)

    meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    nombre_carpeta = f"{meses[d_ini.month-1]} {d_ini.year}"
    return d_ini, d_fin, nombre_carpeta

def carpeta_facturas(nombre_carpeta):
    ruta = os.path.join(ICLOUD_BASE, EMPRESA_CARPETA, "Facturas", nombre_carpeta)
    os.makedirs(ruta, exist_ok=True)
    return ruta

def nombre_unico(carpeta, filename, fecha_email):
    fecha_prefix = fecha_email.strftime("%Y%m%d")
    filename_limpio = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', filename).strip()
    nombre_final = f"{fecha_prefix}_{filename_limpio}"
    if os.path.exists(os.path.join(carpeta, nombre_final)):
        hora_prefix = fecha_email.strftime("%Y%m%d_%H%M")
        nombre_final = f"{hora_prefix}_{filename_limpio}"
    return nombre_final

def contiene_palabra_factura(texto):
    return any(p in texto.lower() for p in PALABRAS_ASUNTO)

def es_doc_alberto_valido(asunto):
    asunto_lower = asunto.lower()
    # Prioridad 1: si contiene SS o listado costes → SIEMPRE incluir
    # aunque el asunto también diga "nóminas"
    if any(p in asunto_lower for p in ALBERTO_DOCS_SI):
        return True
    # Prioridad 2: excluir nóminas puras y otros docs no deseados
    if any(p in asunto_lower for p in ALBERTO_NOMINAS):
        return False
    if any(p in asunto_lower for p in ALBERTO_DOCS_NO):
        return False
    # Prioridad 3: factura de la asesoría (ej: "FACTURA FEBRERO")
    return contiene_palabra_factura(asunto)

def obtener_partes(payload):
    partes = []
    if 'parts' in payload:
        for parte in payload['parts']:
            partes.extend(obtener_partes(parte))
    else:
        partes.append(payload)
    return partes

def tiene_adjunto_pdf(payload):
    for parte in obtener_partes(payload):
        filename = parte.get('filename', '')
        if filename and any(filename.lower().endswith(ext)
                           for ext in ['.pdf', '.doc', '.docx', '.xml']):
            return True
    return False

def descargar_adjuntos(service, msg_id, payload, carpeta, fecha_email, es_alberto=False):
    total = 0
    for parte in obtener_partes(payload):
        filename = parte.get('filename', '')
        if not filename:
            continue
        if not any(filename.lower().endswith(ext)
                  for ext in ['.pdf', '.doc', '.docx', '.xml']):
            continue
        # Si es email de Alberto, saltar archivos de nóminas
        if es_alberto:
            nombre_lower = filename.lower()
            if any(p in nombre_lower for p in ['nomina', 'nómina', 'nom_', '_nom']):
                print(f"    ⏭️  Saltando nómina: {filename}")
                continue

        body = parte.get('body', {})
        attachment_id = body.get('attachmentId')
        data = body.get('data', '')

        if attachment_id:
            adj = service.users().messages().attachments().get(
                userId='me', messageId=msg_id, id=attachment_id).execute()
            data = adj.get('data', '')

        if not data:
            continue

        bytes_data = base64.urlsafe_b64decode(data + '==')
        nombre_archivo = nombre_unico(carpeta, filename, fecha_email)
        filepath = os.path.join(carpeta, nombre_archivo)

        with open(filepath, 'wb') as f:
            f.write(bytes_data)
        print(f"    ✅ {nombre_archivo}")
        total += 1

    return total

def generar_informe(sin_adjunto, fecha_ini, fecha_fin, carpeta):
    if not sin_adjunto:
        return
    fecha_str = datetime.now().strftime("%Y%m%d_%H%M")
    nombre = f"FACTURAS_PENDIENTES_DESCARGAR_{fecha_str}.txt"
    filepath = os.path.join(carpeta, nombre)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("=" * 60 + "\n")
        f.write("REYPIK MARKET S.L. — FACTURAS PENDIENTES DE DESCARGA\n")
        f.write("=" * 60 + "\n")
        f.write(f"Período: {fecha_ini.strftime('%d/%m/%Y')} - {fecha_fin.strftime('%d/%m/%Y')}\n")
        f.write(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
        f.write("=" * 60 + "\n\n")
        f.write("Descarga estas facturas manualmente desde la web:\n\n")
        for i, item in enumerate(sin_adjunto, 1):
            f.write(f"{i}. {item['proveedor']}\n")
            f.write(f"   Asunto:    {item['asunto']}\n")
            f.write(f"   Fecha:     {item['fecha']}\n")
            f.write(f"   Remitente: {item['remitente']}\n\n")
    print(f"\n📋 Informe generado: {nombre}")

# ══════════════════════════════════════════════════════════════
#  EJECUCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  REYPIK MARKET S.L. — Gestión automática de facturas")
    print("=" * 60)

    if not os.path.exists(CREDENTIALS_JSON):
        print(f"\n❌ No encuentro credentials.json en COSAS PARA COWORK")
        sys.exit(1)

    fecha_ini, fecha_fin, nombre_carpeta = pedir_fechas()
    print(f"\n🔍 Período: {fecha_ini.strftime('%d/%m/%Y')} → {fecha_fin.strftime('%d/%m/%Y')}")
    print(f"📁 Carpeta: {nombre_carpeta}")

    print("\n🔐 Autenticando con Gmail de REYPIK (expresscatolica@gmail.com)...")
    print("   (Se abrirá el navegador la primera vez)")
    try:
        service = autenticar_gmail()
        print("✅ Autenticación correcta")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    carpeta_periodo = carpeta_facturas(nombre_carpeta)

    fecha_ini_str = fecha_ini.strftime("%Y/%m/%d")
    fecha_fin_str = fecha_fin.strftime("%Y/%m/%d")
    query = f"after:{fecha_ini_str} before:{fecha_fin_str}"

    print(f"\n📬 Buscando emails en Gmail de REYPIK...")
    todos_emails = []
    page_token = None
    while True:
        params = {'userId': 'me', 'q': query, 'maxResults': 500}
        if page_token:
            params['pageToken'] = page_token
        resultado = service.users().messages().list(**params).execute()
        todos_emails.extend(resultado.get('messages', []))
        page_token = resultado.get('nextPageToken')
        if not page_token:
            break

    print(f"   Total emails en el período: {len(todos_emails)}")
    print(f"\n📂 Procesando...\n")

    total_descargados = 0
    total_procesados  = 0
    sin_adjunto       = []
    ids_procesados    = set()

    for msg_ref in todos_emails:
        if msg_ref['id'] in ids_procesados:
            continue
        ids_procesados.add(msg_ref['id'])

        try:
            msg_meta = service.users().messages().get(
                userId='me', id=msg_ref['id'],
                format='metadata',
                metadataHeaders=['From', 'Subject', 'Date']
            ).execute()

            headers    = {h['name']: h['value']
                         for h in msg_meta['payload'].get('headers', [])}
            remitente_raw = headers.get('From', '').lower()
            asunto        = headers.get('Subject', '')
            fecha_str     = headers.get('Date', '')

            email_match = re.search(r'<(.+?)>', remitente_raw)
            email_rem   = email_match.group(1).lower() if email_match else remitente_raw.strip()

            if any(ig in email_rem for ig in IGNORAR_REMITENTES):
                continue

            try:
                fecha_email = parsedate_to_datetime(fecha_str).replace(tzinfo=None)
            except:
                fecha_email = datetime.now()

            if email_rem == ALBERTO_SERRANO:
                if not es_doc_alberto_valido(asunto):
                    continue
                es_factura = True
            else:
                es_factura = contiene_palabra_factura(asunto)

            if not es_factura:
                continue

            total_procesados += 1

            nombre_proveedor = PROVEEDORES_SIN_ADJUNTO.get(email_rem)
            if nombre_proveedor:
                print(f"⚠️  SIN ADJUNTO: {nombre_proveedor} — {asunto[:55]}")
                sin_adjunto.append({
                    'proveedor': nombre_proveedor,
                    'asunto':    asunto,
                    'fecha':     fecha_email.strftime('%d/%m/%Y'),
                    'remitente': email_rem
                })
                continue

            msg_full = service.users().messages().get(
                userId='me', id=msg_ref['id'], format='full').execute()
            payload = msg_full['payload']

            if not tiene_adjunto_pdf(payload):
                print(f"⚠️  SIN ADJUNTO: {email_rem} — {asunto[:55]}")
                sin_adjunto.append({
                    'proveedor': email_rem,
                    'asunto':    asunto,
                    'fecha':     fecha_email.strftime('%d/%m/%Y'),
                    'remitente': email_rem
                })
                continue

            print(f"\n📧 {asunto[:65]}")
            print(f"   De: {email_rem} | {fecha_email.strftime('%d/%m/%Y')}")

            carpeta_dest = carpeta_periodo
            n = descargar_adjuntos(service, msg_ref['id'], payload, carpeta_dest, fecha_email)
            total_descargados += n

        except Exception as e:
            print(f"❌ Error: {e}")
            continue

    generar_informe(sin_adjunto, fecha_ini, fecha_fin, carpeta_periodo)

    print(f"\n{'=' * 60}")
    print(f"  ✅ PROCESO COMPLETADO")
    print(f"  Emails analizados:       {total_procesados}")
    print(f"  Archivos descargados:    {total_descargados}")
    print(f"  Facturas sin adjunto:    {len(sin_adjunto)} (ver informe TXT)")
    print(f"\n  📁 iCloud Drive → {EMPRESA_CARPETA}")
    print(f"     └── Facturas → {nombre_carpeta}")
    print(f"{'=' * 60}\n")
