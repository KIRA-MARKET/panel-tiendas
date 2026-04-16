#!/usr/bin/env python3
# =============================================================
#  KIRA MARKET S.L. — Envío automático de nóminas + iCloud Drive
#  Uso: python3 enviar_nominas_kira.py
# =============================================================

import os, io, re, smtplib, sys
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from datetime import datetime
import shutil

try:
    from pypdf import PdfReader, PdfWriter
    from pdf2image import convert_from_path
    import pytesseract
    from PIL import Image
    import numpy as np
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    import pandas as pd
except ImportError:
    print("\n❌ Faltan librerías. Ejecuta primero en el Terminal:")
    print("source ~/nominas_env/bin/activate")
    print("pip3 install pypdf pdf2image pytesseract pillow reportlab pandas openpyxl numpy")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════
#  CONFIGURACIÓN — SOLO EDITA ESTA SECCIÓN
# ══════════════════════════════════════════════════════════════

EMAIL_EMPRESA   = "expressgranvia@gmail.com"
CONTRASENA_APP  = "tvncvyzdfgnzorbo"   # ← EDITA ESTO
EMAIL_PRUEBAS   = "nachorumartin@gmail.com"
MODO_PRUEBA     = False   # True = prueba a tu email. False = envío real

EXCEL_EMPLEADOS = "/Users/nacho/Desktop/COSAS PARA COWORK/documentos/DATOS PLANTILLA KIRA MARKET.xlsx"
SELLO_PNG       = "/Users/nacho/Desktop/COSAS PARA COWORK/assets/SELLO Y FIRMA KIRA MARKET PNG.png"
EXCLUIR_NOMBRE  = "RUIZ MARTIN, IGNACIO"   # Tu nómina — nunca se envía

# Ruta base en iCloud Drive
ICLOUD_BASE     = "/Users/nacho/Library/Mobile Documents/com~apple~CloudDocs"
EMPRESA_CARPETA = "KIRA MARKET S.L."

# ══════════════════════════════════════════════════════════════

def ruta_icloud_nomina(nombre_empleado, año):
    """Devuelve la ruta completa en iCloud Drive para la nómina de un empleado."""
    carpeta = os.path.join(
        ICLOUD_BASE,
        EMPRESA_CARPETA,
        "Empleados",
        nombre_empleado,
        "Nóminas",
        str(año)
    )
    os.makedirs(carpeta, exist_ok=True)
    return carpeta

def guardar_en_icloud(filepath, nombre_empleado, filename, año):
    """Copia la nómina a la carpeta correspondiente en iCloud Drive."""
    try:
        destino = ruta_icloud_nomina(nombre_empleado, año)
        destino_archivo = os.path.join(destino, filename)
        shutil.copy2(filepath, destino_archivo)
        return True
    except Exception as e:
        print(f"  ⚠️  Error guardando en iCloud: {e}")
        return False

def limpiar_fondo_sello(sello_path):
    img = Image.open(sello_path).convert('RGBA')
    arr = np.array(img)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    brillo = (r.astype(int) + g.astype(int) + b.astype(int)) / 3
    arr[:,:,3] = np.where(brillo > 180, 0, 255)
    resultado = Image.fromarray(arr, 'RGBA')
    tmp = "/tmp/sello_transparente.png"
    resultado.save(tmp)
    return tmp

def crear_overlay_sello(sello_transparente):
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(595, 842))
    sello = ImageReader(sello_transparente)
    c.drawImage(sello, 60, 148, width=160, height=95,
                preserveAspectRatio=True, mask='auto')
    c.save()
    packet.seek(0)
    return PdfReader(packet)

def extraer_nombre_pagina(img):
    w, h = img.size
    right_top = img.crop((w//2, 0, w, h//5))
    text = pytesseract.image_to_string(right_top, lang='eng')
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for j, line in enumerate(lines):
        if 'TRABAJADOR' in line and j+1 < len(lines):
            return lines[j+1].upper().strip()
    return None

def procesar_nominas(pdf_path, mes_label, año):
    print(f"\n📄 Procesando: {pdf_path}")

    df = pd.read_excel(EXCEL_EMPLEADOS)
    df.columns = ['TRABAJADOR', 'NIF', 'FECHA_ANTIGUEDAD', 'EMAIL']
    email_dict = {str(r['TRABAJADOR']).strip().upper(): str(r['EMAIL']).strip()
                  for _, r in df.iterrows()}

    print("🖊️  Preparando sello con firma...")
    sello_tmp = limpiar_fondo_sello(SELLO_PNG)
    overlay   = crear_overlay_sello(sello_tmp)

    print("🔍 Extrayendo nombres (tarda 1-2 minutos)...")
    images = convert_from_path(pdf_path, dpi=250)
    reader = PdfReader(pdf_path)

    nominas = []
    for i, (page, img) in enumerate(zip(reader.pages, images)):
        nombre = extraer_nombre_pagina(img)
        if not nombre:
            print(f"  ⚠️  Pág {i+1}: no se detectó nombre, saltando")
            continue

        writer = PdfWriter()
        page.merge_page(overlay.pages[0])
        writer.add_page(page)

        nombre_limpio = re.sub(r'[^A-Z0-9]', '_', nombre)
        filename = f"Nomina_{mes_label}_{nombre_limpio}.pdf"
        filepath = f"/tmp/{filename}"

        with open(filepath, 'wb') as f:
            writer.write(f)

        # Guardar en iCloud Drive
        excluido = (nombre == EXCLUIR_NOMBRE.upper())
        icloud_ok = guardar_en_icloud(filepath, nombre, filename, año)
        email    = email_dict.get(nombre)

        nominas.append({
            'nombre': nombre, 'archivo': filepath,
            'filename': filename, 'email': email,
            'excluido': excluido, 'icloud': icloud_ok
        })

        icloud_estado = '☁️ iCloud ✅' if icloud_ok else '☁️ iCloud ❌'
        if excluido:
            print(f"  Pág {i+1}: {nombre} ❌ EXCLUIDO (tu nómina) | {icloud_estado}")
        else:
            print(f"  Pág {i+1}: {nombre} ✅ → {email or 'SIN EMAIL'} | {icloud_estado}")

    return nominas

def enviar_nominas(nominas, mes_label):
    print(f"\n📧 Conectando con Gmail...")
    try:
        servidor = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        servidor.login(EMAIL_EMPRESA, CONTRASENA_APP.replace(" ", ""))
    except Exception as e:
        print(f"❌ Error de conexión Gmail: {e}")
        print("Verifica que la contraseña de aplicación es correcta.")
        return

    enviados  = 0
    errores   = 0
    icloud_ok = sum(1 for n in nominas if n['icloud'])
    mes_texto = mes_label.replace("_", " ")

    for n in nominas:
        if n['excluido']:
            continue
        if not n['email']:
            print(f"  ⚠️  {n['nombre']}: sin email, saltando")
            errores += 1
            continue

        destinatario  = EMAIL_PRUEBAS if MODO_PRUEBA else n['email']
        nombre_propio = n['nombre'].split(',')[1].strip().title() if ',' in n['nombre'] else n['nombre'].title()

        msg = MIMEMultipart()
        msg['From']    = EMAIL_EMPRESA
        msg['To']      = destinatario
        msg['Subject'] = f"Nómina {mes_texto} — KIRA MARKET S.L."
        cuerpo = (
            f"Estimado/a {nombre_propio},\n\n"
            f"Adjunta encontrarás tu nómina correspondiente al mes de {mes_texto}.\n\n"
            f"Saludos,\nKIRA MARKET S.L."
        )
        msg.attach(MIMEText(cuerpo, 'plain'))

        with open(n['archivo'], 'rb') as f:
            adjunto = MIMEBase('application', 'octet-stream')
            adjunto.set_payload(f.read())
        encoders.encode_base64(adjunto)
        adjunto.add_header('Content-Disposition', f'attachment; filename="{n["filename"]}"')
        msg.attach(adjunto)

        try:
            servidor.sendmail(EMAIL_EMPRESA, destinatario, msg.as_string())
            modo = " [PRUEBA]" if MODO_PRUEBA else ""
            print(f"  ✅ {n['nombre']}{modo} → {destinatario}")
            enviados += 1
        except Exception as e:
            print(f"  ❌ Error enviando a {n['nombre']}: {e}")
            errores += 1

    servidor.quit()

    # Email resumen
    try:
        resumen_msg = MIMEMultipart()
        resumen_msg['From']    = EMAIL_EMPRESA
        resumen_msg['To']      = EMAIL_EMPRESA
        resumen_msg['Subject'] = f"✅ Nóminas enviadas: {enviados}/{enviados+errores} — {mes_texto}"
        resumen_body = (
            f"Resumen envío nóminas KIRA MARKET S.L.\n\n"
            f"Mes: {mes_texto}\n"
            f"Emails enviados: {enviados}\n"
            f"Errores de envío: {errores}\n"
            f"Guardadas en iCloud: {icloud_ok}/{len(nominas)}\n"
            f"Modo prueba: {'SÍ' if MODO_PRUEBA else 'NO'}\n"
            f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n"
        )
        resumen_msg.attach(MIMEText(resumen_body, 'plain'))
        srv2 = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        srv2.login(EMAIL_EMPRESA, CONTRASENA_APP.replace(" ", ""))
        srv2.sendmail(EMAIL_EMPRESA, EMAIL_EMPRESA, resumen_msg.as_string())
        srv2.quit()
        print(f"\n📊 Email resumen enviado a {EMAIL_EMPRESA}")
    except:
        pass

    print(f"\n{'='*50}")
    print(f"  EMAILS:  {enviados} enviados, {errores} errores")
    print(f"  iCLOUD:  {icloud_ok}/{len(nominas)} guardadas")
    if MODO_PRUEBA:
        print(f"  ⚠️  MODO PRUEBA — emails enviados a {EMAIL_PRUEBAS}")
    print(f"{'='*50}\n")


# ══════════════════════════════════════════════════════════════
#  EJECUCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  KIRA MARKET S.L. — Envío automático de nóminas")
    print("="*50)

    if "PON_AQUI" in CONTRASENA_APP:
        print("\n❌ Falta la contraseña de aplicación.")
        print("Abre el script con TextEdit y edita CONTRASENA_APP.")
        sys.exit(1)

    if not os.path.exists(EXCEL_EMPLEADOS):
        print(f"\n❌ No encuentro el Excel:\n   {EXCEL_EMPLEADOS}")
        sys.exit(1)

    if not os.path.exists(SELLO_PNG):
        print(f"\n❌ No encuentro el sello:\n   {SELLO_PNG}")
        sys.exit(1)

    print("\n📂 Arrastra aquí el PDF de nóminas y pulsa Enter:")
    pdf_path = input("   → ").strip().strip("'\"").replace("\\ ", " ")

    if not os.path.exists(pdf_path):
        print(f"❌ No encuentro el archivo: {pdf_path}")
        sys.exit(1)

    print("\n📅 ¿A qué mes corresponden? (ej: Febrero_2026)")
    mes_label = input("   → ").strip().replace(" ", "_")

    # Extraer el año del mes para las carpetas de iCloud
    año = datetime.now().year
    partes = mes_label.split("_")
    for p in partes:
        if p.isdigit() and len(p) == 4:
            año = int(p)
            break

    if MODO_PRUEBA:
        print(f"\n⚠️  MODO PRUEBA — emails a: {EMAIL_PRUEBAS}")
    else:
        print(f"\n🚀 MODO REAL — emails a cada empleado")

    print(f"☁️  iCloud Drive → {EMPRESA_CARPETA}/Empleados/[nombre]/Nóminas/{año}/")
    print("\n¿Continuar? (s/n)")
    if input("   → ").strip().lower() != 's':
        print("Cancelado.")
        sys.exit(0)

    nominas = procesar_nominas(pdf_path, mes_label, año)
    enviar_nominas(nominas, mes_label)
