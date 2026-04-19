#!/usr/bin/env python3
"""
Extractor de datos del Listado de Costes del laboral (PDF).
Cada PDF tiene una tabla con: Bruto, IRPF, Ap.Trab, Líquido, Ap.Emp, Coste por empleado.
"""

import re
import os
from pdf2image import convert_from_path
import pytesseract
from PIL import ImageOps


MESES = {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
    'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
    'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
}


def parsear_importe(texto):
    """Convierte '1.028,24' a 1028.24."""
    if not texto:
        return 0.0
    texto = texto.strip().replace('.', '').replace(',', '.')
    try:
        return float(texto)
    except ValueError:
        return 0.0


def extraer_listado_costes(pdf_path, empresa=None):
    """Extrae todos los registros de un listado de costes."""
    images = convert_from_path(pdf_path, dpi=400)
    texto_completo = ""

    for img in images:
        gray = ImageOps.grayscale(img)
        binary = gray.point(lambda x: 0 if x < 140 else 255)
        texto_completo += pytesseract.image_to_string(binary, config='--psm 6') + "\n"

    # Detectar empresa
    if not empresa:
        if 'KIRA' in texto_completo.upper():
            empresa = 'KIRA MARKET SL'
        elif 'REYPIK' in texto_completo.upper():
            empresa = 'REYPIK MARKET SL'
        else:
            empresa = 'DESCONOCIDA'

    # Detectar año
    anio = None
    anio_match = re.search(r'A[ñn]o:\s*(\d{4})', texto_completo, re.IGNORECASE)
    if not anio_match:
        anio_match = re.search(r'Afio:\s*(\d{4})', texto_completo, re.IGNORECASE)
    if anio_match:
        anio = int(anio_match.group(1))

    # Dividir el texto en bloques por mes (un PDF puede tener varios meses)
    # Buscar todas las marcas de mes
    marcas_mes = list(re.finditer(r'Mes:\s*\d+\s*\((\w+)\)', texto_completo, re.IGNORECASE))

    if not marcas_mes:
        # Intentar derivar mes del nombre del archivo
        marcas_mes = []

    # Crear bloques de texto por mes
    bloques_mes = []
    for i, m in enumerate(marcas_mes):
        mes_num = MESES.get(m.group(1).upper())
        inicio = m.start()
        fin = marcas_mes[i + 1].start() if i + 1 < len(marcas_mes) else len(texto_completo)
        bloques_mes.append((mes_num, texto_completo[inicio:fin]))

    # Si no encontramos marcas de mes, usar todo el texto con mes=None
    if not bloques_mes:
        bloques_mes = [(None, texto_completo)]

    registros = []

    patron_trabajador = re.compile(
        r'Trabajador:\s*(\d+)\s+(.+?)(?:\n|$)',
        re.IGNORECASE
    )
    # Aceptar NORMA y NORMAL — capturar 12 números separados por espacios
    patron_norma = re.compile(
        r'NORMA?L?\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)'
    )

    for mes, bloque_mes in bloques_mes:
        trabajadores = patron_trabajador.findall(bloque_mes)

        for num, nombre_raw in trabajadores:
            nombre = nombre_raw.strip()
            pos = bloque_mes.find(f"Trabajador: {num} {nombre_raw}")
            if pos == -1:
                pos = bloque_mes.find(nombre_raw)
            if pos == -1:
                continue

            # Limitar búsqueda hasta el siguiente "Trabajador:" para no pisar datos
            siguiente = re.search(r'Trabajador:', bloque_mes[pos + 10:])
            fin_bloque = pos + 10 + siguiente.start() if siguiente else pos + 500
            bloque = bloque_mes[pos:fin_bloque]
            norma = patron_norma.search(bloque)

            if norma:
                bruto = parsear_importe(norma.group(1))
                especies = parsear_importe(norma.group(2))
                irpf = parsear_importe(norma.group(3))
                anticipos = parsear_importe(norma.group(4))
                otr_ded = parsear_importe(norma.group(5))
                pror_pagas = parsear_importe(norma.group(6))
                pag_del = parsear_importe(norma.group(7))
                ap_trab = parsear_importe(norma.group(8))
                liquido = parsear_importe(norma.group(9))
                ap_emp = parsear_importe(norma.group(10))
                ap_total = parsear_importe(norma.group(11))
                coste = parsear_importe(norma.group(12))

                # Validación: coste debe ser >= bruto (bruto + ap.emp)
                if coste < bruto and bruto > 0:
                    coste = round(bruto + ap_emp, 2)
                # Validar ap_total = ap_trab + ap_emp
                if abs(ap_total - (ap_trab + ap_emp)) > 1:
                    ap_total = round(ap_trab + ap_emp, 2)

                registros.append({
                    'numero': num,
                    'nombre': nombre,
                    'empresa': empresa,
                    'mes': mes,
                    'anio': anio,
                    'bruto': bruto,
                    'especies': especies,
                    'irpf': irpf,
                    'ap_trab': ap_trab,
                    'liquido': liquido,
                    'ap_emp': ap_emp,
                    'ap_total': ap_total,
                    'coste': coste,
                })

    return registros


def procesar_costes_directorio(directorio, empresa=None):
    """Procesa todos los PDFs de listado de costes de un directorio."""
    todos = []
    for archivo in sorted(os.listdir(directorio)):
        if archivo.lower().endswith('.pdf') and 'listado' in archivo.lower():
            ruta = os.path.join(directorio, archivo)
            print(f"  {archivo}...", end=' ')
            registros = extraer_listado_costes(ruta, empresa)
            print(f"{len(registros)} empleados")
            todos.extend(registros)
    return todos


if __name__ == '__main__':
    # Test con enero de KIRA
    pdf = "/Users/nacho/Desktop/COSAS PARA COWORK/analisis-personal/costes_laboral/2025/KIRA-MARKET/Listado costes enero.pdf"
    registros = extraer_listado_costes(pdf, empresa='KIRA MARKET SL')

    print(f"\n{'='*95}")
    print(f"{'NOMBRE':<40} {'BRUTO':>10} {'IRPF':>8} {'AP.TRAB':>8} {'LÍQUIDO':>10} {'AP.EMP':>9} {'COSTE':>10}")
    print(f"{'='*95}")
    for r in registros:
        print(f"{r['nombre']:<40} {r['bruto']:>10.2f} {r['irpf']:>8.2f} {r['ap_trab']:>8.2f} {r['liquido']:>10.2f} {r['ap_emp']:>9.2f} {r['coste']:>10.2f}")

    total_coste = sum(r['coste'] for r in registros)
    print(f"{'='*95}")
    print(f"{'TOTAL':>40} {sum(r['bruto'] for r in registros):>10.2f} {'':>8} {'':>8} {'':>10} {sum(r['ap_emp'] for r in registros):>9.2f} {total_coste:>10.2f}")
    print(f"\nTotal esperado del listado: 30.710,24€")
