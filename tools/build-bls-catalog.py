#!/usr/bin/env python3
"""Build the compact CutCoach runtime catalog from the official BLS 4.0 XLSX."""

from pathlib import Path
import argparse
import json
import re
import xml.etree.ElementTree as ET
import zipfile

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
FIELDS = {
    'calories': 'ENERCC',
    'protein': 'PROT625',
    'carbs': 'CHO',
    'fat': 'FAT',
    'fiber': 'FIBT',
    'sugar': 'SUGAR',
    'saturatedFat': 'FASAT',
    'salt': 'NACL',
}
FEATURED = {
    # [Frühstück, Mittagessen, Abendessen, Snack], 0 means not suggested.
    'C133000': [1, 0, 0, 7],       # Hafer Flocken
    'N410100': [2, 0, 0, 4],       # Kaffee
    'M710100': [3, 10, 10, 1],     # Skyr
    'E111132': [4, 12, 12, 6],     # Hühnerei gekocht
    'F503100': [5, 0, 0, 2],       # Banane
    'F110100': [6, 0, 0, 3],       # Apfel
    'M713100': [7, 0, 0, 5],       # Magerquark
    'M141200': [8, 0, 0, 8],       # Joghurt 1,5 %
    'B121000': [9, 0, 0, 0],       # Roggenvollkornbrot
    'B314000': [10, 0, 0, 0],      # Toastbrot
    'H880200': [11, 0, 0, 9],      # Erdnussbutter
    'F301100': [12, 0, 0, 10],     # Erdbeere
    'F304100': [13, 0, 0, 11],     # Heidelbeere
    'M111200': [14, 0, 0, 0],      # Milch 1,5 %
    'V4A6182': [0, 1, 1, 0],       # Hähnchenbrust gebraten
    'C352032': [0, 2, 2, 0],       # Reis gekocht
    'K110132': [0, 3, 3, 0],       # Kartoffel gekocht
    'E401032': [0, 4, 4, 0],       # Teigwaren gekocht
    'U010182': [0, 5, 5, 0],       # Rinderhack gebraten
    'T410100': [0, 6, 6, 0],       # Lachs
    'T121902': [0, 7, 7, 0],       # Thunfisch im eigenen Saft
    'G312152': [0, 8, 8, 0],       # Broccoli gedünstet
    'G561100': [0, 9, 9, 0],       # Tomate
    'G520100': [0, 10, 10, 0],     # Gurke
    'G620100': [0, 11, 11, 0],     # Karotte
    'H742902': [0, 12, 12, 0],     # Kidneybohnen
    'H730132': [0, 13, 13, 0],     # Linsen gekocht
    'X469753': [0, 14, 14, 0],     # Chili con carne
    'X912033': [0, 15, 15, 0],     # Pizza Margherita
    'X730033': [0, 16, 16, 0],     # Lasagne al forno
    'Y921162': [0, 17, 17, 0],     # Döner Kebab Geflügel
    'M711100': [0, 0, 0, 12],      # Körniger Frischkäse
    'H210100': [0, 0, 0, 13],      # Mandeln
    'C532700': [0, 0, 0, 14],      # Reiswaffeln
    'F502100': [0, 0, 0, 15],      # Avocado
}


def column_index(reference):
    letters = re.match(r'[A-Z]+', reference).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value - 1


def shared_strings(archive):
    values = []
    with archive.open('xl/sharedStrings.xml') as source:
        for _, element in ET.iterparse(source, events=('end',)):
            if element.tag == f'{NS}si':
                values.append(''.join(node.text or '' for node in element.iter(f'{NS}t')))
                element.clear()
    return values


def cell_value(cell, strings):
    kind = cell.attrib.get('t')
    raw = cell.find(f'{NS}v')
    if raw is None or raw.text is None:
        return None
    if kind == 's':
        return strings[int(raw.text)]
    if kind in ('str', 'inlineStr'):
        return raw.text
    try:
        value = float(raw.text)
        return int(value) if value.is_integer() else value
    except ValueError:
        return raw.text


def worksheet_rows(archive, strings):
    with archive.open('xl/worksheets/sheet1.xml') as source:
        for _, element in ET.iterparse(source, events=('end',)):
            if element.tag != f'{NS}row':
                continue
            row = {}
            for cell in element.findall(f'{NS}c'):
                row[column_index(cell.attrib['r'])] = cell_value(cell, strings)
            yield row
            element.clear()


def number(value):
    if isinstance(value, (int, float)):
        rounded = round(float(value), 2)
        return int(rounded) if rounded.is_integer() else rounded
    return None


def build(source):
    with zipfile.ZipFile(source) as archive:
        strings = shared_strings(archive)
        rows = worksheet_rows(archive, strings)
        header_row = next(rows)
        header = {index: value for index, value in header_row.items() if isinstance(value, str)}
        indexes = {}
        for field, code in FIELDS.items():
            indexes[field] = next(index for index, title in header.items() if title.startswith(f'{code} '))

        items = []
        excluded = 0
        for row in rows:
            code, name = row.get(0), row.get(1)
            values = {field: number(row.get(index)) for field, index in indexes.items()}
            if not isinstance(code, str) or not isinstance(name, str):
                excluded += 1
                continue
            if values['calories'] is None or values['calories'] <= 0 or any(values[field] is None for field in ('protein', 'carbs', 'fat')):
                excluded += 1
                continue
            items.append([code, name, *[values[field] for field in FIELDS]])

    ids = {item[0] for item in items}
    missing_featured = sorted(set(FEATURED) - ids)
    if missing_featured:
        raise RuntimeError(f'Featured BLS codes missing from catalog: {missing_featured}')
    return items, excluded


def javascript(items, excluded):
    rows = json.dumps(items, ensure_ascii=False, separators=(',', ':'))
    featured = json.dumps(FEATURED, ensure_ascii=False, separators=(',', ':'))
    meta = json.dumps({
        'schemaVersion': 1,
        'source': 'BLS',
        'sourceVersion': '4.0',
        'released': '2025',
        'count': len(items),
        'excluded': excluded,
        'basis': '100 g essbarer Anteil',
        'license': 'CC BY 4.0',
        'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/deed.de',
        'sourceUrl': 'https://www.blsdb.de/',
        'doi': '10.25826/Data20251217-134202-0',
        'attribution': 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0 – Deutsche Nährstoffdatenbank.',
    }, ensure_ascii=False, separators=(',', ':'))
    return f"""'use strict';
// Generated by tools/build-bls-catalog.py from the official BLS 4.0 workbook.
(function(global){{
  const META=Object.freeze({meta});
  const FEATURED={featured};
  const MEALS=['Frühstück','Mittagessen','Abendessen','Snack'];
  const ROWS={rows};
  const ITEMS=Object.freeze(ROWS.map(row=>Object.freeze({{
    id:`bls:${{row[0]}}`,name:row[1],kind:'food',barcode:'',amount:100,unit:'g',
    calories:row[2],protein:row[3],carbs:row[4],fat:row[5],fiber:row[6],sugar:row[7],saturatedFat:row[8],salt:row[9],
    favorite:false,uses:0,lastUsedAt:null,createdAt:null,components:[],catalog:true,source:'bls',sourceId:row[0],sourceVersion:'4.0',featured:FEATURED[row[0]]||null
  }})));
  const BY_ID=new Map(ITEMS.map(item=>[item.id,item]));
  const SUGGESTIONS=Object.freeze(Object.fromEntries(MEALS.map((meal,index)=>[meal,Object.freeze(ITEMS.filter(item=>(item.featured?.[index]||0)>0).sort((a,b)=>a.featured[index]-b.featured[index]))])));
  global.CutCoachFoodCatalog=Object.freeze({{
    meta:META,
    items:()=>ITEMS,
    get:id=>BY_ID.get(String(id))||BY_ID.get(`bls:${{String(id)}}`)||null,
    suggestions:meal=>SUGGESTIONS[meal]||Object.freeze([])
  }});
}})(window);
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, help='Path to BLS_4_0_Daten_2025_DE.xlsx')
    parser.add_argument('--output', type=Path, default=Path('food-catalog.js'))
    args = parser.parse_args()
    items, excluded = build(args.source)
    args.output.write_text(javascript(items, excluded), encoding='utf-8')
    print(json.dumps({'items': len(items), 'excluded': excluded, 'output': str(args.output), 'bytes': args.output.stat().st_size}, ensure_ascii=False))


if __name__ == '__main__':
    main()
