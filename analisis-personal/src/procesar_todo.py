#!/usr/bin/env python3
"""
Procesamiento completo: extrae datos de listados de costes y nóminas,
cruza resultados y genera CSV consolidado.
"""

import os
import csv
import json
import re
import sys
from datetime import datetime

# Añadir src al path
sys.path.insert(0, os.path.dirname(__file__))
from extractor import procesar_pdf, PRECIO_HORA_FESTIVO, PRECIO_HORA_COMPLEMENTARIA
from extractor_costes import extraer_listado_costes

BASE = "/Users/nacho/Desktop/COSAS PARA COWORK/analisis-personal"
OUTPUT = os.path.join(BASE, "resultados")

EMPRESAS = {
    'KIRA-MARKET': 'KIRA MARKET SL',
    'REYPIK-MARKET': 'REYPIK MARKET SL',
}

MESES_NOMBRE = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
}


def normalizar_nombre(nombre):
    """Normaliza un nombre para poder cruzar entre nómina y listado de costes.
    Nómina: 'CALVO GONZALEZ, VANESA'
    Listado: 'VANESA CALVO GONZALEZ'
    → clave: conjunto de palabras en mayúsculas, sin acentos.
    """
    nombre = nombre.upper().strip()
    nombre = re.sub(r'[,.]', ' ', nombre)
    nombre = re.sub(r'\s+', ' ', nombre)
    # Quitar acentos básicos
    for a, b in [('Á','A'),('É','E'),('Í','I'),('Ó','O'),('Ú','U'),('Ñ','N'),('Ü','U')]:
        nombre = nombre.replace(a, b)
    return nombre


def clave_nombre(nombre):
    """Genera clave de cruce: palabras ordenadas alfabéticamente."""
    n = normalizar_nombre(nombre)
    palabras = sorted(n.split())
    return ' '.join(palabras)


def procesar_listados():
    """Procesa todos los listados de costes."""
    print("\n" + "=" * 70)
    print("FASE 1: EXTRAYENDO LISTADOS DE COSTES")
    print("=" * 70)

    todos = []
    for carpeta, empresa in EMPRESAS.items():
        dir_costes = os.path.join(BASE, "costes_laboral", "2025", carpeta)
        if not os.path.exists(dir_costes):
            print(f"  ⚠ No existe: {dir_costes}")
            continue

        print(f"\n--- {empresa} ---")
        for archivo in sorted(os.listdir(dir_costes)):
            if archivo.lower().endswith('.pdf'):
                ruta = os.path.join(dir_costes, archivo)
                print(f"  {archivo}...", end=' ', flush=True)
                try:
                    registros = extraer_listado_costes(ruta, empresa)
                    meses_en_pdf = sorted(set(r['mes'] for r in registros if r['mes']))
                    print(f"{len(registros)} empleados, meses={meses_en_pdf}")
                    todos.extend(registros)
                except Exception as e:
                    print(f"ERROR: {e}")

    # Deduplicar: si un empleado+mes aparece más de una vez, quedarse con el último
    vistos = {}
    for r in todos:
        clave = (r['empresa'], clave_nombre(r['nombre']), r['mes'])
        vistos[clave] = r
    todos = list(vistos.values())

    return todos


def procesar_nominas():
    """Procesa todos los PDFs de nóminas."""
    print("\n" + "=" * 70)
    print("FASE 2: EXTRAYENDO NÓMINAS (detalle: festivos, h. complementarias)")
    print("=" * 70)

    todos = []
    for carpeta, empresa in EMPRESAS.items():
        dir_nominas = os.path.join(BASE, "nominas", "2025", carpeta)
        if not os.path.exists(dir_nominas):
            print(f"  ⚠ No existe: {dir_nominas}")
            continue

        print(f"\n--- {empresa} ---")
        archivos = sorted(os.listdir(dir_nominas))

        # Identificar archivos de nóminas normales y rectificaciones
        normales = [a for a in archivos if a.lower().startswith('nominas') and a.lower().endswith('.pdf')]
        rectificaciones = [a for a in archivos if a.lower().endswith('.pdf') and a not in normales]

        # Procesar nóminas normales
        for archivo in normales:
            ruta = os.path.join(dir_nominas, archivo)
            print(f"\n  {archivo}:")
            try:
                registros = procesar_pdf(ruta, empresa_override=empresa)
                todos.extend(registros)
            except Exception as e:
                print(f"    ERROR: {e}")

        # Procesar rectificaciones (pisan las originales por nombre+mes)
        for archivo in rectificaciones:
            ruta = os.path.join(dir_nominas, archivo)
            print(f"\n  [RECTIFICACIÓN] {archivo}:")
            try:
                registros = procesar_pdf(ruta, empresa_override=empresa)
                # Marcar como rectificación
                for r in registros:
                    r['rectificacion'] = True
                todos.extend(registros)
            except Exception as e:
                print(f"    ERROR: {e}")

    return todos


def aplicar_rectificaciones(registros_nomina):
    """Si hay rectificaciones, pisan al registro original del mismo empleado+mes."""
    por_clave = {}
    for r in registros_nomina:
        clave = (clave_nombre(r['nombre']), r['mes'], r['empresa'])
        if clave in por_clave and not r.get('rectificacion'):
            continue  # Ya hay una rectificación, no pisar
        por_clave[clave] = r
    return list(por_clave.values())


def cruzar_datos(listados, nominas):
    """Cruza listados de costes con nóminas por nombre + mes + empresa."""
    print("\n" + "=" * 70)
    print("FASE 3: CRUZANDO DATOS")
    print("=" * 70)

    # Indexar nóminas por clave
    nominas_idx = {}
    for n in nominas:
        clave = (clave_nombre(n['nombre']), n['mes'], n['empresa'])
        nominas_idx[clave] = n

    resultados = []
    sin_cruce = 0

    for l in listados:
        clave = (clave_nombre(l['nombre']), l['mes'], l['empresa'])
        n = nominas_idx.get(clave)

        registro = {
            'nombre': l['nombre'],
            'empresa': l['empresa'],
            'mes': l['mes'],
            'anio': l['anio'],
            'bruto': l['bruto'],
            'irpf': l['irpf'],
            'ap_trab': l['ap_trab'],
            'liquido': l['liquido'],
            'ap_emp': l['ap_emp'],
            'ap_total': l['ap_total'],
            'coste_empresa': l['coste'],
            # Datos de nómina (detalle)
            'salario_base': n['salario_base'] if n else 0,
            'antiguedad': n.get('antiguedad', 0) if n else 0,
            'pagas_extra': n.get('pagas_extra', 0) if n else 0,
            'festivos_importe': n['festivos_importe'] if n else 0,
            'festivos_horas': n['festivos_horas'] if n else 0,
            'hc_importe': n['hc_importe'] if n else 0,
            'hc_horas': n['hc_horas'] if n else 0,
            'cruce_ok': n is not None,
        }

        # Validar: bruto nómina = bruto listado
        if n and abs(l['bruto'] - n['total_devengado']) > 0.5:
            registro['alerta_bruto'] = f"Nómina={n['total_devengado']:.2f} vs Listado={l['bruto']:.2f}"
        else:
            registro['alerta_bruto'] = ''

        resultados.append(registro)
        if not n:
            sin_cruce += 1

    print(f"  Total registros: {len(resultados)}")
    print(f"  Cruces OK: {len(resultados) - sin_cruce}")
    print(f"  Sin cruce (solo en listado): {sin_cruce}")

    return resultados


def guardar_csv(resultados, ruta):
    """Guarda resultados en CSV."""
    if not resultados:
        return

    campos = [
        'empresa', 'nombre', 'mes', 'anio',
        'salario_base', 'antiguedad', 'pagas_extra',
        'festivos_importe', 'festivos_horas',
        'hc_importe', 'hc_horas',
        'bruto', 'irpf', 'ap_trab', 'liquido',
        'ap_emp', 'ap_total', 'coste_empresa',
        'cruce_ok', 'alerta_bruto'
    ]

    with open(ruta, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=campos, extrasaction='ignore')
        writer.writeheader()
        for r in sorted(resultados, key=lambda x: (x['empresa'], x['nombre'], x['mes'] or 0)):
            writer.writerow(r)

    print(f"\n  CSV guardado: {ruta}")


def resumen(resultados):
    """Muestra resumen por empresa."""
    print("\n" + "=" * 70)
    print("RESUMEN")
    print("=" * 70)

    for empresa in sorted(set(r['empresa'] for r in resultados)):
        emp_data = [r for r in resultados if r['empresa'] == empresa]
        total_coste = sum(r['coste_empresa'] for r in emp_data)
        total_festivos = sum(r['festivos_importe'] for r in emp_data)
        total_hc = sum(r['hc_importe'] for r in emp_data)
        empleados = len(set(r['nombre'] for r in emp_data))
        meses = len(set(r['mes'] for r in emp_data))

        print(f"\n  {empresa}")
        print(f"    Empleados: {empleados}")
        print(f"    Meses procesados: {meses}")
        print(f"    Coste total empresa: {total_coste:,.2f}€")
        print(f"    Total festivos: {total_festivos:,.2f}€")
        print(f"    Total h. complementarias: {total_hc:,.2f}€")

        # Alertas
        alertas = [r for r in emp_data if r.get('alerta_bruto')]
        if alertas:
            print(f"    ⚠ Incongruencias bruto: {len(alertas)}")
            for a in alertas[:5]:
                print(f"      {a['nombre']} mes {a['mes']}: {a['alerta_bruto']}")

        no_cruce = [r for r in emp_data if not r['cruce_ok']]
        if no_cruce:
            print(f"    ⚠ Sin cruce nómina: {len(no_cruce)} registros")


if __name__ == '__main__':
    os.makedirs(OUTPUT, exist_ok=True)

    # Fase 1: Listados de costes
    listados = procesar_listados()

    # Guardar checkpoint
    with open(os.path.join(OUTPUT, 'listados_raw.json'), 'w') as f:
        json.dump(listados, f, ensure_ascii=False, indent=2)
    print(f"\n  Checkpoint: {len(listados)} registros de listados guardados")

    # Fase 2: Nóminas
    nominas = procesar_nominas()
    nominas = aplicar_rectificaciones(nominas)

    # Guardar checkpoint
    with open(os.path.join(OUTPUT, 'nominas_raw.json'), 'w') as f:
        json.dump(nominas, f, ensure_ascii=False, indent=2)
    print(f"\n  Checkpoint: {len(nominas)} registros de nóminas guardados")

    # Fase 3: Cruzar
    resultados = cruzar_datos(listados, nominas)

    # Guardar CSV final
    guardar_csv(resultados, os.path.join(OUTPUT, 'datos_consolidados.csv'))

    # Resumen
    resumen(resultados)

    print("\n✓ Procesamiento completo")
