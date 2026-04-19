#!/usr/bin/env python3
"""
Volcado de datos consolidados a Google Sheets.
Crea pestañas: Datos_Raw, Resumen_Anual, Horas_Extra, Rentabilidad.
"""

import os
import json
import csv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

BASE = "/Users/nacho/Desktop/COSAS PARA COWORK/analisis-personal"
CREDENTIALS = "/Users/nacho/Desktop/COSAS PARA COWORK/credenciales/credentials.json"
TOKEN = "/Users/nacho/Desktop/COSAS PARA COWORK/credenciales/token_sheets.json"
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

MESES_NOMBRE = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
}

PRECIO_HORA_FESTIVO = 16.84
PRECIO_HORA_COMPLEMENTARIA = 14.43


def autenticar():
    """Autenticación OAuth2 para Google Sheets API."""
    creds = None
    if os.path.exists(TOKEN):
        creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN, 'w') as f:
            f.write(creds.to_json())
    return build('sheets', 'v4', credentials=creds)


def cargar_datos():
    """Carga datos consolidados del CSV."""
    ruta = os.path.join(BASE, "resultados", "datos_consolidados.csv")
    with open(ruta, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def crear_spreadsheet(service, titulo):
    """Crea un spreadsheet nuevo y devuelve su ID."""
    body = {
        'properties': {'title': titulo},
        'sheets': [
            {'properties': {'title': 'Datos_Raw'}},
            {'properties': {'title': 'Resumen_Anual'}},
            {'properties': {'title': 'Horas_Extra'}},
            {'properties': {'title': 'Rentabilidad'}},
        ]
    }
    result = service.spreadsheets().create(body=body).execute()
    spreadsheet_id = result['spreadsheetId']
    print(f"  Spreadsheet creado: https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
    return spreadsheet_id


def escribir_datos_raw(service, spreadsheet_id, datos):
    """Pestaña Datos_Raw: un registro por trabajador y mes."""
    print("  Escribiendo Datos_Raw...")

    header = [
        'Empresa', 'Nombre', 'Mes', 'Año',
        'Salario Base', 'Antigüedad', 'Pagas Extra',
        'Festivos €', 'Festivos Horas',
        'H. Complementarias €', 'H. Complementarias Horas',
        'Bruto (Total Devengado)', 'IRPF', 'Ap. Trabajador',
        'Líquido', 'Ap. Empresa', 'Ap. Total',
        'Coste Empresa Total'
    ]

    rows = [header]
    for d in sorted(datos, key=lambda x: (x['empresa'], x['nombre'], int(x['mes'] or 0))):
        mes_num = int(d['mes']) if d['mes'] else 0
        rows.append([
            d['empresa'],
            d['nombre'],
            MESES_NOMBRE.get(mes_num, str(mes_num)),
            d.get('anio', '2025'),
            float(d.get('salario_base', 0) or 0),
            float(d.get('antiguedad', 0) or 0),
            float(d.get('pagas_extra', 0) or 0),
            float(d.get('festivos_importe', 0) or 0),
            float(d.get('festivos_horas', 0) or 0),
            float(d.get('hc_importe', 0) or 0),
            float(d.get('hc_horas', 0) or 0),
            float(d.get('bruto', 0) or 0),
            float(d.get('irpf', 0) or 0),
            float(d.get('ap_trab', 0) or 0),
            float(d.get('liquido', 0) or 0),
            float(d.get('ap_emp', 0) or 0),
            float(d.get('ap_total', 0) or 0),
            float(d.get('coste_empresa', 0) or 0),
        ])

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Datos_Raw!A1',
        valueInputOption='RAW',
        body={'values': rows}
    ).execute()
    print(f"    {len(rows)-1} registros escritos")


def escribir_resumen_anual(service, spreadsheet_id, datos):
    """Pestaña Resumen_Anual: coste total anual por trabajador y empresa."""
    print("  Escribiendo Resumen_Anual...")

    # Agrupar por empresa + nombre
    resumen = {}
    for d in datos:
        clave = (d['empresa'], d['nombre'])
        if clave not in resumen:
            resumen[clave] = {
                'bruto_anual': 0, 'coste_anual': 0, 'festivos_anual': 0,
                'hc_anual': 0, 'meses': 0, 'irpf_anual': 0,
                'ap_emp_anual': 0,
            }
        r = resumen[clave]
        r['bruto_anual'] += float(d.get('bruto', 0) or 0)
        r['coste_anual'] += float(d.get('coste_empresa', 0) or 0)
        r['festivos_anual'] += float(d.get('festivos_importe', 0) or 0)
        r['hc_anual'] += float(d.get('hc_importe', 0) or 0)
        r['irpf_anual'] += float(d.get('irpf', 0) or 0)
        r['ap_emp_anual'] += float(d.get('ap_emp', 0) or 0)
        r['meses'] += 1

    header = [
        'Empresa', 'Nombre', 'Meses Trabajados',
        'Bruto Anual', 'IRPF Anual', 'Ap. Empresa Anual',
        'Coste Empresa Anual', 'Festivos Anual €', 'H. Comp. Anual €',
        'Coste Medio Mensual'
    ]

    rows = [header]
    for (empresa, nombre), r in sorted(resumen.items()):
        coste_medio = round(r['coste_anual'] / r['meses'], 2) if r['meses'] > 0 else 0
        rows.append([
            empresa, nombre, r['meses'],
            round(r['bruto_anual'], 2),
            round(r['irpf_anual'], 2),
            round(r['ap_emp_anual'], 2),
            round(r['coste_anual'], 2),
            round(r['festivos_anual'], 2),
            round(r['hc_anual'], 2),
            coste_medio,
        ])

    # Totales por empresa
    rows.append([])
    rows.append(['TOTALES POR EMPRESA'])
    for empresa in sorted(set(d['empresa'] for d in datos)):
        emp_data = {k: v for k, v in resumen.items() if k[0] == empresa}
        total_coste = sum(v['coste_anual'] for v in emp_data.values())
        total_festivos = sum(v['festivos_anual'] for v in emp_data.values())
        total_hc = sum(v['hc_anual'] for v in emp_data.values())
        total_bruto = sum(v['bruto_anual'] for v in emp_data.values())
        rows.append([
            empresa, f'{len(emp_data)} empleados', '',
            round(total_bruto, 2), '', '',
            round(total_coste, 2),
            round(total_festivos, 2),
            round(total_hc, 2),
        ])

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Resumen_Anual!A1',
        valueInputOption='RAW',
        body={'values': rows}
    ).execute()
    print(f"    {len(resumen)} empleados")


def escribir_horas_extra(service, spreadsheet_id, datos):
    """Pestaña Horas_Extra: detalle mensual de h. complementarias y festivos."""
    print("  Escribiendo Horas_Extra...")

    header = [
        'Empresa', 'Nombre', 'Mes',
        'H. Complementarias €', 'H. Complementarias Horas',
        'Festivos €', 'Festivos Horas',
        'Total Extra €'
    ]

    rows = [header]
    for d in sorted(datos, key=lambda x: (x['empresa'], x['nombre'], int(x['mes'] or 0))):
        hc = float(d.get('hc_importe', 0) or 0)
        fest = float(d.get('festivos_importe', 0) or 0)
        if hc > 0 or fest > 0:
            mes_num = int(d['mes']) if d['mes'] else 0
            rows.append([
                d['empresa'], d['nombre'],
                MESES_NOMBRE.get(mes_num, str(mes_num)),
                hc, float(d.get('hc_horas', 0) or 0),
                fest, float(d.get('festivos_horas', 0) or 0),
                round(hc + fest, 2),
            ])

    # Resumen mensual por empresa
    rows.append([])
    rows.append(['RESUMEN MENSUAL POR EMPRESA'])
    rows.append(['Empresa', 'Mes', 'Total H. Comp. €', 'Total Festivos €', 'Total Extra €'])

    for empresa in sorted(set(d['empresa'] for d in datos)):
        for mes in range(1, 13):
            mes_data = [d for d in datos if d['empresa'] == empresa and int(d['mes'] or 0) == mes]
            total_hc = sum(float(d.get('hc_importe', 0) or 0) for d in mes_data)
            total_fest = sum(float(d.get('festivos_importe', 0) or 0) for d in mes_data)
            if total_hc > 0 or total_fest > 0:
                rows.append([
                    empresa, MESES_NOMBRE[mes],
                    round(total_hc, 2), round(total_fest, 2),
                    round(total_hc + total_fest, 2),
                ])

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Horas_Extra!A1',
        valueInputOption='RAW',
        body={'values': rows}
    ).execute()
    print(f"    {len(rows)-1} filas")


def escribir_rentabilidad(service, spreadsheet_id, datos):
    """Pestaña Rentabilidad: análisis contratar vs. extras."""
    print("  Escribiendo Rentabilidad...")

    rows = []
    rows.append(['INFORME DE RENTABILIDAD: ¿CONTRATAR O PAGAR EXTRAS?'])
    rows.append([])

    for empresa in sorted(set(d['empresa'] for d in datos)):
        emp_data = [d for d in datos if d['empresa'] == empresa]

        # Calcular totales
        total_hc = sum(float(d.get('hc_importe', 0) or 0) for d in emp_data)
        total_fest = sum(float(d.get('festivos_importe', 0) or 0) for d in emp_data)
        total_extra = total_hc + total_fest
        media_mensual_hc = total_hc / 12
        media_mensual_fest = total_fest / 12
        media_mensual_extra = total_extra / 12

        # Horas totales
        total_hc_horas = sum(float(d.get('hc_horas', 0) or 0) for d in emp_data)
        total_fest_horas = sum(float(d.get('festivos_horas', 0) or 0) for d in emp_data)

        # Distribución mensual
        meses_con_hc = []
        for mes in range(1, 13):
            mes_hc = sum(float(d.get('hc_importe', 0) or 0) for d in emp_data if int(d['mes'] or 0) == mes)
            meses_con_hc.append(mes_hc)

        rows.append([f'=== {empresa} ==='])
        rows.append([])
        rows.append(['Concepto', 'Total Anual', 'Media Mensual'])
        rows.append(['H. Complementarias €', round(total_hc, 2), round(media_mensual_hc, 2)])
        rows.append(['H. Complementarias (horas)', round(total_hc_horas, 1), round(total_hc_horas / 12, 1)])
        rows.append(['Festivos €', round(total_fest, 2), round(media_mensual_fest, 2)])
        rows.append(['Festivos (horas)', round(total_fest_horas, 1), round(total_fest_horas / 12, 1)])
        rows.append(['TOTAL EXTRAS €', round(total_extra, 2), round(media_mensual_extra, 2)])
        rows.append([])

        # Estacionalidad
        rows.append(['Distribución mensual H. Complementarias'])
        rows.append(['Mes', 'Importe €'])
        for mes in range(1, 13):
            rows.append([MESES_NOMBRE[mes], round(meses_con_hc[mes - 1], 2)])
        rows.append([])

        # === COSTES REALES POR TIPO DE CONTRATO ===
        rows.append(['COSTES REALES POR TIPO DE CONTRATO (datos reales 2025, sin extras ni antigüedad)'])
        rows.append(['Tipo contrato', 'Horas/semana', 'Horas/mes', 'Sal. Base', 'Bruto/mes', 'SS Empresa/mes', 'COSTE EMPRESA/mes', 'COSTE EMPRESA/año'])
        contratos = [
            ('Parcial 15h', 15, 65.0, 405.88, 541.16, 174.36, 715.52, 8586.24),
            ('Parcial 25h', 25, 108.25, 676.46, 901.94, 290.60, 1192.54, 14310.48),
            ('Parcial 30h', 30, 129.9, 811.76, 1082.36, 348.73, 1431.09, 17173.08),
        ]
        for row in contratos:
            rows.append(list(row))
        rows.append([])

        # === PRECIOS HORA EXTRA ===
        rows.append(['PRECIOS HORA EXTRA'])
        rows.append(['Concepto', 'Precio/hora'])
        rows.append(['H. Complementarias', 14.43])
        rows.append(['Festivos', 16.84])
        rows.append([])

        # === PUNTO DE EQUILIBRIO ===
        rows.append(['PUNTO DE EQUILIBRIO: ¿Cuántas horas extras/mes necesitas para que compense contratar?'])
        rows.append(['Contrato', 'Coste/mes contrato', 'Coste/hora contrato', 'H. extras equivalentes (a 14,43€/h)', 'H. extras equivalentes (a 16,84€/h)'])
        for tipo, h_sem, h_mes, _, _, _, coste_mes, _ in contratos:
            coste_hora_contrato = round(coste_mes / h_mes, 2)
            equilibrio_hc = round(coste_mes / 14.43, 1)
            equilibrio_fest = round(coste_mes / 16.84, 1)
            rows.append([tipo, coste_mes, coste_hora_contrato, equilibrio_hc, equilibrio_fest])
        rows.append([])

        # === COMPARATIVA CON GASTO REAL EN EXTRAS ===
        rows.append([f'COMPARATIVA: Gasto real en extras vs coste de contratar — {empresa}'])
        rows.append(['Contrato nuevo', 'Coste anual contrato', 'Gasto anual en extras (real)',
                      'Diferencia', 'Veredicto'])
        for tipo, h_sem, h_mes, _, _, _, coste_mes, coste_anual in contratos:
            diff = total_extra - coste_anual
            if diff > coste_anual * 0.1:
                veredicto = 'CONTRATAR — las extras superan el coste del contrato'
            elif diff > 0:
                veredicto = 'AJUSTADO — casi iguales, valorar estacionalidad'
            else:
                veredicto = 'NO COMPENSA — las extras cuestan menos que el contrato'
            rows.append([tipo, coste_anual, round(total_extra, 2), round(diff, 2), veredicto])

        rows.append([])
        rows.append(['ANÁLISIS DE ESTACIONALIDAD'])
        rows.append(['Si las extras se concentran en pocos meses, puede no compensar un contrato fijo.'])
        rows.append(['Si se reparten uniformemente, sí compensa contratar.'])
        rows.append(['Mes', 'H. Comp. €', 'Festivos €', 'Total extras €',
                      f'> {715.52:.0f}€ (=15h)?', f'> {1192.54:.0f}€ (=25h)?', f'> {1431.09:.0f}€ (=30h)?'])
        meses_supera_15 = 0
        meses_supera_25 = 0
        meses_supera_30 = 0
        for mes in range(1, 13):
            mes_data = [d for d in emp_data if int(d['mes'] or 0) == mes]
            hc_mes = sum(float(d.get('hc_importe', 0) or 0) for d in mes_data)
            fest_mes = sum(float(d.get('festivos_importe', 0) or 0) for d in mes_data)
            total_mes = hc_mes + fest_mes
            sup15 = 'SÍ' if total_mes > 715.52 else ''
            sup25 = 'SÍ' if total_mes > 1192.54 else ''
            sup30 = 'SÍ' if total_mes > 1431.09 else ''
            if total_mes > 715.52: meses_supera_15 += 1
            if total_mes > 1192.54: meses_supera_25 += 1
            if total_mes > 1431.09: meses_supera_30 += 1
            rows.append([MESES_NOMBRE[mes], round(hc_mes, 2), round(fest_mes, 2), round(total_mes, 2), sup15, sup25, sup30])
        rows.append([])
        rows.append(['Meses que superan coste contrato:', '', '',
                      '', f'{meses_supera_15}/12 meses', f'{meses_supera_25}/12 meses', f'{meses_supera_30}/12 meses'])

        # === CONCLUSIÓN ===
        rows.append([])
        rows.append(['CONCLUSIÓN'])
        if total_extra > 17173.08:
            rows.append([f'El gasto anual en extras ({round(total_extra,2)}€) supera el coste de un contrato de 30h ({17173.08}€).'])
            rows.append(['Recomendación: valorar contratación de 30h si el volumen es estable.'])
        elif total_extra > 14310.48:
            rows.append([f'El gasto anual en extras ({round(total_extra,2)}€) supera el coste de un contrato de 25h ({14310.48}€).'])
            rows.append(['Recomendación: valorar contratación de 25h.'])
        elif total_extra > 8586.24:
            rows.append([f'El gasto anual en extras ({round(total_extra,2)}€) supera el coste de un contrato de 15h ({8586.24}€).'])
            rows.append(['Recomendación: valorar contratación de 15h si el volumen es estable.'])
        else:
            rows.append([f'El gasto anual en extras ({round(total_extra,2)}€) no supera el coste de ningún contrato.'])
            rows.append(['Recomendación: mantener la estructura actual de horas extras.'])
        rows.append([])
        rows.append([])

    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Rentabilidad!A1',
        valueInputOption='RAW',
        body={'values': rows}
    ).execute()
    print(f"    Informe generado")


if __name__ == '__main__':
    print("Autenticando con Google Sheets API...")
    service = autenticar()

    print("\nCargando datos...")
    datos = cargar_datos()
    print(f"  {len(datos)} registros")

    print("\nCreando spreadsheet...")
    spreadsheet_id = crear_spreadsheet(service, 'Análisis Personal KIRA & REYPIK 2025')

    escribir_datos_raw(service, spreadsheet_id, datos)
    escribir_resumen_anual(service, spreadsheet_id, datos)
    escribir_horas_extra(service, spreadsheet_id, datos)
    escribir_rentabilidad(service, spreadsheet_id, datos)

    print(f"\n✓ Volcado completo")
    print(f"  https://docs.google.com/spreadsheets/d/{spreadsheet_id}")

    # Guardar ID para el dashboard
    with open(os.path.join(BASE, "resultados", "spreadsheet_id.txt"), 'w') as f:
        f.write(spreadsheet_id)
