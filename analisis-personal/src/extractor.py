#!/usr/bin/env python3
"""
Extractor de datos de nóminas en PDF.
Lee PDFs de nóminas (una página por empleado) y extrae datos estructurados.
"""

import re
import os
from pdf2image import convert_from_path
import pytesseract
from PIL import ImageOps


# Precios por hora (confirmados con Nacho)
PRECIO_HORA_FESTIVO = 16.84
PRECIO_HORA_COMPLEMENTARIA = 14.43


def ocr_zona(img, box, psm=6):
    """Recorta una zona de la imagen y aplica OCR con binarización."""
    crop = img.crop(box)
    crop = ImageOps.grayscale(crop)
    crop = crop.point(lambda x: 0 if x < 140 else 255)
    return pytesseract.image_to_string(crop, config=f'--psm {psm}')


def parsear_importe(texto):
    """Convierte texto de importe ('1.028,24') a float (1028.24)."""
    if not texto:
        return 0.0
    texto = texto.strip().replace('.', '').replace(',', '.')
    try:
        return float(texto)
    except ValueError:
        return 0.0


def buscar_importe(texto, patron):
    """Busca un patrón seguido de un importe y lo devuelve como float."""
    match = re.search(patron + r'\s+([\d.,]+)', texto, re.IGNORECASE)
    if match:
        return parsear_importe(match.group(1))
    return 0.0


def extraer_nombre(texto_cabecera, texto_nombre_zona=None):
    """Extrae el nombre del trabajador. Usa zona derecha si está disponible."""
    texto = texto_nombre_zona or texto_cabecera
    # Limpiar: reemplazar saltos de línea por espacios
    texto = ' '.join(texto.split())

    # Buscar patrón APELLIDO(S), NOMBRE(S) — requiere coma
    matches = re.findall(
        r'([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})*\s*,\s*[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})*)',
        texto
    )
    # Filtrar nombres de empresa/dirección
    falsos = {'MARKET', 'GRAN', 'COLON', 'GRANADA', 'EMPRESA', 'TRABAJADOR',
              'DEPENDIENTE', 'PROFESIONAL', 'CATEGORIA', 'COTIZACION'}

    for m in matches:
        # Limpiar saltos de línea y texto residual del OCR
        m = m.split('\n')[0].strip()
        # Quitar palabras antes de la coma que sean de empresa
        pre_coma = m.split(',')[0].strip().split()
        # Limpiar: si empieza con palabras de empresa, quitarlas
        while pre_coma and pre_coma[0].upper() in falsos | {'KIRA', 'REYPIK', 'SL'}:
            pre_coma.pop(0)
        if len(pre_coma) >= 1:
            post_coma = m.split(',')[1].strip()
            # Quitar texto residual del OCR (NIF, números, etc.)
            post_coma = re.sub(r'\s+(NIF|N\.?I\.?F|Numero|N\.\s*A).*$', '', post_coma, flags=re.IGNORECASE)
            nombre_limpio = ' '.join(pre_coma) + ', ' + post_coma.strip()
            return nombre_limpio

    return "DESCONOCIDO"


def extraer_periodo(texto_cabecera):
    """Extrae mes y año del periodo de liquidación."""
    meses = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
        'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
        'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
    }
    # Buscar "de MES del YYYY" o "MES de YYYY" o "MES del YYYY"
    for nombre_mes, num_mes in meses.items():
        if nombre_mes in texto_cabecera.upper():
            # Buscar año
            match = re.search(r'20\d{2}', texto_cabecera)
            if match:
                return num_mes, int(match.group())
    return None, None


def extraer_empresa(texto_cabecera):
    """Extrae el nombre de la empresa."""
    if 'KIRA' in texto_cabecera.upper():
        return 'KIRA MARKET SL'
    elif 'REYPIK' in texto_cabecera.upper():
        return 'REYPIK MARKET SL'
    return 'DESCONOCIDA'


def extraer_pagina(img):
    """Extrae todos los datos de una página de nómina."""
    W, H = img.width, img.height

    # Zona 1: Cabecera completa (empresa, periodo)
    texto_cabecera = ocr_zona(img, (80, 60, W - 80, int(H * 0.16)))

    # Zona 1b: Solo la mitad derecha de la cabecera (nombre del trabajador)
    texto_nombre_zona = ocr_zona(img, (W // 2, 60, W - 80, int(H * 0.08)))

    # Zona 2: Devengos (salario base, pagas, festivos, h. complementarias)
    texto_devengos = ocr_zona(img, (80, int(H * 0.15), W - 80, int(H * 0.42)))

    # Zona 3: Mitad inferior completa (totales, deducciones, bases empresa)
    texto_inferior = ocr_zona(img, (80, int(H * 0.38), W - 80, H - 50))

    # Alias para compatibilidad
    texto_totales = texto_inferior
    texto_empresa = texto_inferior

    # Todo el texto junto para búsquedas globales
    texto_completo = texto_cabecera + '\n' + texto_devengos + '\n' + texto_inferior

    # --- Parsear campos ---
    nombre = extraer_nombre(texto_cabecera, texto_nombre_zona)
    empresa = extraer_empresa(texto_cabecera)
    mes, anio = extraer_periodo(texto_cabecera)

    # Devengos
    salario_base = buscar_importe(texto_devengos, r'SALARIO\s+BASE')
    antiguedad = buscar_importe(texto_devengos, r'ANTIG[UÜ]EDAD')

    # Pagas extra (buscar todas y sumar)
    pagas = re.findall(r'PAGA\s+EXTRA\s+\w+\s+([\d.,]+)', texto_devengos, re.IGNORECASE)
    total_pagas = sum(parsear_importe(p) for p in pagas)

    # Festivos
    festivos_importe = buscar_importe(texto_devengos, r'FESTIVOS')
    festivos_horas = round(festivos_importe / PRECIO_HORA_FESTIVO, 2) if festivos_importe > 0 else 0

    # Horas complementarias
    hc_importe = buscar_importe(texto_devengos, r'(?:HORAS?\s+COMPLEMENTARIAS?|H\.\s*COMPLEMENTARIAS?)')
    hc_horas = round(hc_importe / PRECIO_HORA_COMPLEMENTARIA, 2) if hc_importe > 0 else 0

    # Percepciones no salariales (IT, enfermedad, etc.)
    pns_enfermedad = buscar_importe(texto_devengos, r'PRESTACI[OÓ]N[\s:]+ENFERMEDAD')
    pns_complemento_it = buscar_importe(texto_devengos, r'COMPLEMENTO\s+I\.?T\.?')
    total_pns = pns_enfermedad + pns_complemento_it

    # Total devengado
    total_devengado = buscar_importe(texto_totales, r'(?:A\.\s*)?TOTAL\s+DEVENGADO')
    if total_devengado == 0:
        total_devengado = buscar_importe(texto_devengos, r'(?:A\.\s*)?TOTAL\s+DEVENGADO')

    # IRPF
    irpf_match = re.search(r'I\.?R\.?P\.?F\.?\s+([\d.,]+)\s+([\d.,]+)\s*%\s*([\d.,]+)', texto_totales + '\n' + texto_empresa)
    irpf_porcentaje = 0
    irpf_importe = 0
    if irpf_match:
        irpf_porcentaje = parsear_importe(irpf_match.group(2))
        irpf_importe = parsear_importe(irpf_match.group(3))

    # Total a deducir y líquido
    total_deducir = buscar_importe(texto_totales + '\n' + texto_empresa, r'(?:B\.\s*)?TOTAL\s+A\s+DEDUCIR')
    liquido = buscar_importe(texto_totales + '\n' + texto_empresa, r'L[IÍ]QUIDO\s+TOTAL\s+A\s+PERCIBIR')

    # Aportación empresa (TOTAL en cuadro inferior)
    aport_match = re.search(r'TOTAL\s+([\d.,]+)\s+[\d.,]+\s*%\s*([\d.,]+)', texto_empresa)
    aportacion_empresa = 0
    if aport_match:
        aportacion_empresa = parsear_importe(aport_match.group(2))

    # Validación: ningún importe individual debe superar 10.000€
    if total_devengado > 10000:
        total_devengado = 0  # Marcamos como error de OCR para revisar
    if aportacion_empresa > 5000:
        aportacion_empresa = 0

    # Coste total empresa = Total devengado + Aportación empresa SS
    coste_empresa = round(total_devengado + aportacion_empresa, 2)

    return {
        'nombre': nombre,
        'empresa': empresa,
        'mes': mes,
        'anio': anio,
        'salario_base': salario_base,
        'antiguedad': antiguedad,
        'pagas_extra': total_pagas,
        'festivos_importe': festivos_importe,
        'festivos_horas': festivos_horas,
        'hc_importe': hc_importe,
        'hc_horas': hc_horas,
        'percepciones_no_salariales': total_pns,
        'total_devengado': total_devengado,
        'irpf_porcentaje': irpf_porcentaje,
        'irpf_importe': irpf_importe,
        'total_deducir': total_deducir,
        'liquido': liquido,
        'aportacion_empresa_ss': aportacion_empresa,
        'coste_empresa_total': coste_empresa,
    }


def procesar_pdf(pdf_path, empresa_override=None):
    """Procesa un PDF completo de nóminas y devuelve lista de registros."""
    print(f"  Procesando: {os.path.basename(pdf_path)}")
    images = convert_from_path(pdf_path, dpi=400)
    registros = []

    for i, img in enumerate(images):
        try:
            datos = extraer_pagina(img)
            if empresa_override:
                datos['empresa'] = empresa_override
            registros.append(datos)
            estado = "OK" if datos['nombre'] != 'DESCONOCIDO' else "NOMBRE?"
            print(f"    Pág {i+1}: {datos['nombre']} → {datos['total_devengado']:.2f}€ [{estado}]")
        except Exception as e:
            print(f"    Pág {i+1}: ERROR - {e}")

    return registros


if __name__ == '__main__':
    # Test con enero de KIRA
    pdf = "/Users/nacho/Desktop/COSAS PARA COWORK/analisis-personal/nominas/2025/KIRA-MARKET/Nominas enero.pdf"
    registros = procesar_pdf(pdf, empresa_override='KIRA MARKET SL')

    print(f"\n{'='*90}")
    print(f"{'NOMBRE':<35} {'SAL.BASE':>9} {'FESTIV':>8} {'H.COMP':>8} {'DEVENG':>9} {'AP.EMP':>9} {'COSTE':>9}")
    print(f"{'='*90}")
    for r in registros:
        print(f"{r['nombre']:<35} {r['salario_base']:>9.2f} {r['festivos_importe']:>8.2f} {r['hc_importe']:>8.2f} {r['total_devengado']:>9.2f} {r['aportacion_empresa_ss']:>9.2f} {r['coste_empresa_total']:>9.2f}")
