#!/usr/bin/env python3
"""
Dashboard visual de análisis de gasto de personal.
Lee datos del CSV consolidado y sirve una app web con gráficos interactivos.
Ejecutar: python3 dashboard.py
Abrir: http://localhost:5050
"""

import os
import csv
import json
from flask import Flask, render_template, jsonify

BASE = "/Users/nacho/Desktop/COSAS PARA COWORK/analisis-personal"
app = Flask(__name__, template_folder=os.path.join(BASE, 'templates'))

MESES_NOMBRE = {
    1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
    5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
    9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
}


def cargar_datos():
    """Carga datos del CSV consolidado."""
    ruta = os.path.join(BASE, "resultados", "datos_consolidados.csv")
    with open(ruta, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        datos = []
        for row in reader:
            for campo in ['bruto', 'coste_empresa', 'festivos_importe', 'festivos_horas',
                          'hc_importe', 'hc_horas', 'salario_base', 'ap_emp', 'irpf',
                          'liquido', 'ap_trab', 'ap_total', 'antiguedad', 'pagas_extra']:
                row[campo] = float(row.get(campo) or 0)
            row['mes'] = int(row.get('mes') or 0)
            datos.append(row)
    return datos


@app.route('/')
def index():
    return render_template('dashboard.html')


@app.route('/api/datos')
def api_datos():
    datos = cargar_datos()

    # --- Resumen global por empresa ---
    empresas = {}
    for d in datos:
        emp = d['empresa']
        if emp not in empresas:
            empresas[emp] = {'coste': 0, 'bruto': 0, 'festivos': 0, 'hc': 0,
                             'empleados': set(), 'meses': set()}
        empresas[emp]['coste'] += d['coste_empresa']
        empresas[emp]['bruto'] += d['bruto']
        empresas[emp]['festivos'] += d['festivos_importe']
        empresas[emp]['hc'] += d['hc_importe']
        empresas[emp]['empleados'].add(d['nombre'])
        empresas[emp]['meses'].add(d['mes'])

    resumen_empresas = []
    for emp, v in sorted(empresas.items()):
        resumen_empresas.append({
            'empresa': emp,
            'coste_total': round(v['coste'], 2),
            'bruto_total': round(v['bruto'], 2),
            'festivos_total': round(v['festivos'], 2),
            'hc_total': round(v['hc'], 2),
            'num_empleados': len(v['empleados']),
            'num_meses': len(v['meses']),
        })

    # --- Evolución mensual extras por empresa ---
    evolucion = {}
    for d in datos:
        clave = (d['empresa'], d['mes'])
        if clave not in evolucion:
            evolucion[clave] = {'hc': 0, 'festivos': 0}
        evolucion[clave]['hc'] += d['hc_importe']
        evolucion[clave]['festivos'] += d['festivos_importe']

    evolucion_series = {}
    for (emp, mes), v in sorted(evolucion.items()):
        if emp not in evolucion_series:
            evolucion_series[emp] = {'meses': [], 'hc': [], 'festivos': []}
        evolucion_series[emp]['meses'].append(MESES_NOMBRE.get(mes, str(mes)))
        evolucion_series[emp]['hc'].append(round(v['hc'], 2))
        evolucion_series[emp]['festivos'].append(round(v['festivos'], 2))

    # --- Ranking empleados más extras ---
    ranking = {}
    for d in datos:
        clave = (d['empresa'], d['nombre'])
        if clave not in ranking:
            ranking[clave] = {'hc': 0, 'festivos': 0, 'hc_horas': 0, 'fest_horas': 0}
        ranking[clave]['hc'] += d['hc_importe']
        ranking[clave]['festivos'] += d['festivos_importe']
        ranking[clave]['hc_horas'] += d['hc_horas']
        ranking[clave]['fest_horas'] += d['festivos_horas']

    ranking_list = []
    for (emp, nombre), v in ranking.items():
        total = v['hc'] + v['festivos']
        if total > 0:
            ranking_list.append({
                'empresa': emp,
                'nombre': nombre,
                'hc_euros': round(v['hc'], 2),
                'festivos_euros': round(v['festivos'], 2),
                'total_euros': round(total, 2),
                'hc_horas': round(v['hc_horas'], 1),
                'fest_horas': round(v['fest_horas'], 1),
            })
    ranking_list.sort(key=lambda x: x['total_euros'], reverse=True)

    # --- Coste por empleado (mensual y anual) ---
    coste_empleado = {}
    for d in datos:
        clave = (d['empresa'], d['nombre'])
        if clave not in coste_empleado:
            coste_empleado[clave] = {'meses': {}, 'total': 0}
        coste_empleado[clave]['meses'][d['mes']] = round(d['coste_empresa'], 2)
        coste_empleado[clave]['total'] += d['coste_empresa']

    coste_list = []
    for (emp, nombre), v in sorted(coste_empleado.items()):
        coste_list.append({
            'empresa': emp,
            'nombre': nombre,
            'meses': v['meses'],
            'total_anual': round(v['total'], 2),
            'media_mensual': round(v['total'] / max(len(v['meses']), 1), 2),
        })

    # --- Lista de empleados y empresas para filtros ---
    lista_empleados = sorted(set(d['nombre'] for d in datos))
    lista_empresas = sorted(set(d['empresa'] for d in datos))

    # --- Rentabilidad: contratar vs extras ---
    PRECIO_HC = 14.43
    PRECIO_FEST = 16.84
    contratos = [
        {'tipo': '15h/sem', 'horas_sem': 15, 'horas_mes': 65.0, 'coste_mes': 715.52, 'coste_anual': 8586.24},
        {'tipo': '25h/sem', 'horas_sem': 25, 'horas_mes': 108.25, 'coste_mes': 1192.54, 'coste_anual': 14310.48},
        {'tipo': '30h/sem', 'horas_sem': 30, 'horas_mes': 129.9, 'coste_mes': 1431.09, 'coste_anual': 17173.08},
    ]
    for c in contratos:
        c['coste_hora'] = round(c['coste_mes'] / c['horas_mes'], 2)
        c['equilibrio_hc'] = round(c['coste_mes'] / PRECIO_HC, 1)
        c['equilibrio_fest'] = round(c['coste_mes'] / PRECIO_FEST, 1)

    # Extras mensuales por empresa (para estacionalidad)
    rentabilidad = {}
    for emp_name in lista_empresas:
        emp_data = [d for d in datos if d['empresa'] == emp_name]
        total_extras = sum(d['hc_importe'] + d['festivos_importe'] for d in emp_data)
        media_extras = total_extras / 12
        meses_extras = []
        for mes in range(1, 13):
            mes_data = [d for d in emp_data if d['mes'] == mes]
            hc = sum(d['hc_importe'] for d in mes_data)
            fest = sum(d['festivos_importe'] for d in mes_data)
            meses_extras.append({
                'mes': MESES_NOMBRE[mes], 'hc': round(hc, 2), 'fest': round(fest, 2),
                'total': round(hc + fest, 2)
            })
        rentabilidad[emp_name] = {
            'total_extras_anual': round(total_extras, 2),
            'media_extras_mensual': round(media_extras, 2),
            'meses': meses_extras,
        }

    return jsonify({
        'resumen_empresas': resumen_empresas,
        'evolucion': evolucion_series,
        'ranking': ranking_list[:20],
        'coste_empleado': coste_list,
        'rentabilidad': {
            'contratos': contratos,
            'precio_hc': PRECIO_HC,
            'precio_fest': PRECIO_FEST,
            'por_empresa': rentabilidad,
        },
        'filtros': {
            'empleados': lista_empleados,
            'empresas': lista_empresas,
            'meses': list(MESES_NOMBRE.values()),
        }
    })


if __name__ == '__main__':
    print("Dashboard: http://localhost:5050")
    app.run(host='127.0.0.1', port=5050, debug=True)
