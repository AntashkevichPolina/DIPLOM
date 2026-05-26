const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, AlignmentType } = require('docx');
require('dotenv').config();
const nodemailer = require('nodemailer');
const app = express();

// Универсальная функция для безопасного экранирования текста
function escapeHtmlText(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Функция для экранирования в HTML
function escapeHtmlSimple(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Функция для экранирования в JSON/JavaScript
function escapeJsString(text) {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Конфигурация email транспорта
const emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Проверка подключения к SMTP
emailTransporter.verify(function(error, success) {
    if (error) {
        console.error(' Ошибка подключения к SMTP серверу:', error.message);
    } else {
        console.log('SMTP сервер готов к отправке писем');
    }
});

// Функция для генерации серии
function generateDocumentSeries(requestId, seed = 0) {
    const letters = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    
    const hash = (requestId * (seed + 7) + dayOfYear * 13 + 100) % 676;
    const firstIndex = Math.floor(hash / 26);
    const secondIndex = hash % 26;
    
    return letters[firstIndex] + letters[secondIndex];
}

// Функция для получения следующего номера в последовательности для ТТН-1 пополнения
async function getNextReplenishmentTTNNumber(series, connection) {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await connection.request()
        .input('series', sql.NVarChar, series)
        .input('today', sql.Date, today)
        .query(`
            SELECT ISNULL(MAX(CAST(RIGHT(document_number, 7) AS INT)), 0) as last_num
            FROM tbl_StockMovements
            WHERE request_type = 'replenishment'
              AND document_number LIKE 'Серия ' + @series + ' №%'
              AND CAST(movement_date AS DATE) = @today
        `);
    
    const lastNum = result.recordset[0].last_num || 0;
    return lastNum + 1;
}

// Функция генерации ТТН-1 номера для пополнения
async function generateReplenishmentTTNNumber(requestId, connection) {
    const series = generateDocumentSeries(requestId, 3);
    const nextNum = await getNextReplenishmentTTNNumber(series, connection);
    return `Серия ${series} №${String(nextNum).padStart(7, '0')}`;
}

const htmlDocx = require('html-docx-js');

async function exportTN2ToDocx(request, items, formattedDate, documentNumber, totalAmount, totalVat, totalWithVat, completedByUser) {
    
    const finalTotalAmount = Number(totalAmount) || 0;
    const finalTotalVat = Number(totalVat) || 0;
    const finalTotalWithVat = Number(totalWithVat) || 0;
    
    // Строки таблицы товаров
    let itemsRows = '';
    items.forEach((item, idx) => {
        const qty = Number(item.quantity_shipped) || Number(item.quantity_requested) || 0;
        const price = Number(item.price_per_unit) || 0;
        const amount = qty * price;
        const vat = amount * 0.2;
        const amountWithVat = amount + vat;
        
        itemsRows += `
            <tr>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 3px 2px;">${item.name || ''}${item.model ? ' ' + item.model : ''}</td>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: center;">${item.unique_id || ''}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: center;">шт</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${qty}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${price.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${amount.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: center;">20</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${vat.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${amountWithVat.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${qty}</noscript>
                <td style="border: 1px solid #000; padding: 3px 2px; text-align: right;">${(qty * 2).toFixed(2)}</noscript>
            </tr>
        `;
    });
    
    function numToWords(num) {
        const n = Math.floor(Math.abs(num));
        if (n === 0) return 'ноль';
        const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        
        function convertHundreds(val, isFemale = false) {
            const arr = isFemale ? unitsFemale : units;
            let result = '';
            const h = Math.floor(val / 100);
            const t = Math.floor((val % 100) / 10);
            const u = val % 10;
            if (h > 0) result += hundreds[h] + ' ';
            if (t === 1) result += teens[u] + ' ';
            else { if (t > 1) result += tens[t] + ' '; if (u > 0) result += arr[u] + ' '; }
            return result.trim();
        }
        
        function convertNumber(val) {
            let result = '';
            const millions = Math.floor(val / 1000000);
            const thousands = Math.floor((val % 1000000) / 1000);
            const rest = val % 1000;
            if (millions > 0) {
                result += convertHundreds(millions) + ' ';
                const ld = millions % 10, lt = millions % 100;
                if (lt >= 11 && lt <= 19) result += 'миллионов ';
                else if (ld === 1) result += 'миллион ';
                else if (ld >= 2 && ld <= 4) result += 'миллиона ';
                else result += 'миллионов ';
            }
            if (thousands > 0) {
                result += convertHundreds(thousands, true) + ' ';
                const ld = thousands % 10, lt = thousands % 100;
                if (lt >= 11 && lt <= 19) result += 'тысяч ';
                else if (ld === 1) result += 'тысяча ';
                else if (ld >= 2 && ld <= 4) result += 'тысячи ';
                else result += 'тысяч ';
            }
            if (rest > 0) result += convertHundreds(rest);
            return result.trim();
        }
        return convertNumber(n);
    }
    
    const totalItemsQty = items.reduce((sum, i) => sum + (Number(i.quantity_shipped) || Number(i.quantity_requested) || 0), 0);
    const totalWeight = items.reduce((sum, i) => sum + ((Number(i.quantity_shipped) || Number(i.quantity_requested) || 0) * 2), 0);
    const vatKopecks = Math.abs(Math.round((finalTotalVat % 1) * 100));
    const totalWithVatKopecks = Math.abs(Math.round((finalTotalWithVat % 1) * 100));
    
    const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Товарная накладная  ${documentNumber}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 8mm 6mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 10pt; 
            margin: 0;
            padding: 0;
        }
        h1 { 
            font-size: 14pt; 
            text-align: center; 
            font-weight: bold; 
            margin: 0 0 3px 0; 
        }
        h2 { 
            font-size: 12pt; 
            text-align: center; 
            font-weight: normal; 
            margin: 0 0 10px 0; 
        }
        .bordered-table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
            table-layout: fixed;
        }
        .bordered-table td, .bordered-table th {
            border: 1px solid #000;
            padding: 3px 2px;
            vertical-align: middle;
        }
        .bordered-table th {
            font-weight: bold;
            text-align: center;
            background: #fff;
            font-size: 9pt;
            line-height: 1.2;
        }
        .unp-table {
            width: 40%;
            margin: 0 auto 8px auto;
            border-collapse: collapse;
        }
        .unp-table td {
            border: 1px solid #000;
            padding: 4px 8px;
            text-align: center;
            font-size: 10pt;
        }
        
        /* Единая структура для всех полей */
        .field-row {
            margin-bottom: 6px;
        }
        .field-label {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 1px;
        }
        .field-line {
            border-bottom: 1px solid #000;
            padding: 3px 0 1px 5px;
            font-size: 10pt;
        }
        .field-hint {
            font-size: 7pt;
            color: #555;
            margin-top: 1px;
        }
        
        /* Два поля в строке */
        .inline-row {
            display: flex;
            gap: 15px;
            margin-bottom: 6px;
        }
        .inline-col {
            flex: 1;
        }
        .inline-label {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 1px;
        }
        .inline-line {
            border-bottom: 1px solid #000;
            padding: 3px 0 1px 5px;
            font-size: 10pt;
        }
        .inline-hint {
            font-size: 7pt;
            color: #555;
            margin-top: 1px;
        }
        
        .section-title { 
            font-size: 12pt; 
            font-weight: bold; 
            text-align: center; 
            margin: 8px 0 5px 0; 
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .unp-label { font-weight: bold; font-size: 9pt; text-align: center; display: block; margin-bottom: 3px; }
        
        /* Ширина колонок таблицы товаров */
        .col-1 { width: 4%; }
        .col-2 { width: 20%; }
        .col-3 { width: 8%; }
        .col-4 { width: 5%; }
        .col-5 { width: 6%; }
        .col-6 { width: 8%; }
        .col-7 { width: 8%; }
        .col-8 { width: 5%; }
        .col-9 { width: 8%; }
        .col-10 { width: 10%; }
        .col-11 { width: 6%; }
        .col-12 { width: 6%; }
    </style>
</head>
<body>

<h1>ТОВАРНАЯ НАКЛАДНАЯ</h1>
<h2>№ ${documentNumber} от ${formattedDate}</h2>

<div class="unp-label">УНП</div>

<table class="unp-table">
    <tr>
        <td style="font-weight: bold;">Грузоотправитель</td>
        <td style="font-weight: bold;">Грузополучатель</td>
    </tr>
    <tr>
        <td>332279933</td>
        <td>${request.customer_unp || ''}</td>
    </tr>
</table>

<!-- Грузоотправитель -->
<div class="field-row">
    <div class="field-label">Грузоотправитель</div>
    <div class="field-line">НПУП «АТОМТЕХ», 220012, г. Минск, ул. Гикало, д. 5</div>
    <div class="field-hint">(наименование, адрес)</div>
</div>

<!-- Грузополучатель -->
<div class="field-row">
    <div class="field-label">Грузополучатель</div>
    <div class="field-line">${request.customer_name || ''}, ${request.customer_address || ''}</div>
    <div class="field-hint">(наименование, адрес)</div>
</div>

<!-- Основание отпуска -->
<div class="field-row">
    <div class="field-label">Основание отпуска</div>
    <div class="field-line">Договор поставки № ${request.contract_number || 'б/н'} от ${formattedDate}</div>
    <div class="field-hint">(дата и номер договора или другого документа)</div>
</div>

<div class="section-title">I. ТОВАРНЫЙ РАЗДЕЛ</div>

<table class="bordered-table">
    <colgroup>
        <col class="col-1"><col class="col-2"><col class="col-3"><col class="col-4">
        <col class="col-5"><col class="col-6"><col class="col-7"><col class="col-8">
        <col class="col-9"><col class="col-10"><col class="col-11"><col class="col-12">
    </colgroup>
    <thead>
        <tr>
            <th rowspan="2">№ п/п</th>
            <th colspan="2">Оборотные активы</th>
            <th rowspan="2">Ед.<br>изм</th>
            <th rowspan="2">Кол-во</th>
            <th rowspan="2">Цена,<br>руб.</th>
            <th rowspan="2">Сумма,<br>руб.</th>
            <th rowspan="2">НДС%</th>
            <th rowspan="2">Сумма НДС,<br>руб.</th>
            <th rowspan="2">Стоимость<br>с НДС, руб.</th>
            <th rowspan="2">Масса,<br>кг</th>
            <th rowspan="2">Прим.</th>
        </tr>
        <tr>
            <th>наименование</th>
            <th>артикул</th>
        </tr>
        <tr style="background: #f5f5f5;">
            <th style="font-size: 7pt;">1</th>
            <th style="font-size: 7pt;">2</th>
            <th style="font-size: 7pt;">3</th>
            <th style="font-size: 7pt;">4</th>
            <th style="font-size: 7pt;">5</th>
            <th style="font-size: 7pt;">6</th>
            <th style="font-size: 7pt;">7</th>
            <th style="font-size: 7pt;">8</th>
            <th style="font-size: 7pt;">9</th>
            <th style="font-size: 7pt;">10</th>
            <th style="font-size: 7pt;">11</th>
            <th style="font-size: 7pt;">12</th>
        </tr>
    </thead>
    <tbody>
        ${itemsRows}
        <tr style="font-weight: bold;">
            <td colspan="6" style="text-align: right;">ИТОГО:</td>
            <td style="text-align: right;">${finalTotalWithVat.toFixed(2)}</td>
            <td style="text-align: right;">&nbsp;</td>
            <td style="text-align: right;">&nbsp;</td>
            <td style="text-align: right;">${totalWeight.toFixed(2)}</td>
            <td colspan="2" style="text-align: left;">&nbsp;</td>
        </tr>
    </tbody>
</table>

<!-- Всего сумма НДС -->
<div class="field-row">
    <div class="field-label">Всего сумма НДС</div>
    <div class="field-line">${finalTotalVat.toFixed(2)} руб. (${numToWords(finalTotalVat)} рублей ${vatKopecks} копеек)</div>
</div>

<!-- Всего стоимость с НДС -->
<div class="field-row">
    <div class="field-label">Всего стоимость с НДС</div>
    <div class="field-line">${finalTotalWithVat.toFixed(2)} руб. (${numToWords(finalTotalWithVat)} рублей ${totalWithVatKopecks} копеек)</div>
</div>

<!-- Отпуск разрешил -->
<div class="field-row">
    <div class="field-label">Отпуск разрешил</div>
    <div class="field-line"></div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись)</div>
</div>

<!-- Сдал грузоотправитель -->
<div class="field-row">
    <div class="field-label">Сдал грузоотправитель</div>
    <div class="field-line">${completedByUser ? completedByUser.position + ' ' + completedByUser.full_name : ''}</div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись грузоотправителя)</div>
</div>

<!-- Товар к доставке принял -->
<div class="field-row">
    <div class="field-label">Товар к доставке принял</div>
    <div class="field-line"></div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись)</div>
</div>

<!-- Доверенность -->
<div class="inline-row">
    <div class="inline-col">
        <div class="inline-label">по доверенности</div>
        <div class="inline-line"></div>
        <div class="inline-hint">(номер, дата)</div>
    </div>
    <div class="inline-col">
        <div class="inline-label">выданной</div>
        <div class="inline-line"></div>
        <div class="inline-hint">(наименование организации)</div>
    </div>
</div>

<!-- Принял грузополучатель -->
<div class="field-row">
    <div class="field-label">Принял грузополучатель</div>
    <div class="field-line"></div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись грузополучателя)</div>
</div>

<!-- С товаром переданы документы -->
<div class="field-row">
    <div class="field-label">С товаром переданы документы</div>
    <div class="field-line">Товарная накладная  ${documentNumber}</div>
</div>

</body>
</html>`;

    const blob = await htmlDocx.asBlob(fullHtml);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return buffer;
}

async function exportTTN1ToDocx(request, items, formattedDate, formattedTime, documentNumber, totalAmount, totalVat, totalWithVat, totalWeight, totalItems, completedByUser, docDateForCalc, isReplenishment = false) {
    
    const finalTotalAmount = Number(totalAmount) || 0;
    const finalTotalVat = Number(totalVat) || 0;
    const finalTotalWithVat = Number(totalWithVat) || 0;
    const finalTotalWeight = Number(totalWeight) || 0;
    const finalTotalItems = Number(totalItems) || 0;
    
    // Формируем даты для погрузки/разгрузки
    let pastDateTime = '';
    let currentDateTime = '';
    
    if (docDateForCalc) {
        const pastDate = new Date(docDateForCalc);
        pastDate.setHours(pastDate.getHours() - 1);
        pastDateTime = `${String(pastDate.getDate()).padStart(2, '0')}.${String(pastDate.getMonth() + 1).padStart(2, '0')}.${pastDate.getFullYear()} ${String(pastDate.getHours()).padStart(2, '0')}:${String(pastDate.getMinutes()).padStart(2, '0')}`;
        currentDateTime = `${formattedDate} ${formattedTime}`;
    } else {
        const now = new Date();
        const pastDate = new Date(now);
        pastDate.setHours(pastDate.getHours() - 1);
        pastDateTime = `${String(pastDate.getDate()).padStart(2, '0')}.${String(pastDate.getMonth() + 1).padStart(2, '0')}.${pastDate.getFullYear()} ${String(pastDate.getHours()).padStart(2, '0')}:${String(pastDate.getMinutes()).padStart(2, '0')}`;
        currentDateTime = `${formattedDate} ${formattedTime}`;
    }
    
    // Разбираем автомобиль
    let vehicleMake = '', vehicleNumber = '';
    const vehicleFull = request.vehicle_number || '';
    const vehicleMatch = vehicleFull.match(/^([A-Za-zА-Яа-я0-9\-]+)\s+([A-Za-z0-9\-]+)$/);
    if (vehicleMatch) {
        vehicleMake = vehicleMatch[1];
        vehicleNumber = vehicleMatch[2];
    } else {
        vehicleMake = vehicleFull;
    }
    
    // Разбираем прицеп
    let trailerMake = '', trailerNumber = '';
    const trailerFull = request.trailer_number || '';
    const trailerMatch = trailerFull.match(/^([A-Za-zА-Яа-я0-9\-]+)\s+([A-Za-z0-9\-]+)$/);
    if (trailerMatch) {
        trailerMake = trailerMatch[1];
        trailerNumber = trailerMatch[2];
    } else {
        trailerMake = trailerFull;
    }
    
    function numToWords(num) {
        const n = Math.floor(Math.abs(num));
        if (n === 0) return 'ноль';
        const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        
        function convertHundreds(val, isFemale = false) {
            const arr = isFemale ? unitsFemale : units;
            let result = '';
            const h = Math.floor(val / 100);
            const t = Math.floor((val % 100) / 10);
            const u = val % 10;
            if (h > 0) result += hundreds[h] + ' ';
            if (t === 1) result += teens[u] + ' ';
            else { if (t > 1) result += tens[t] + ' '; if (u > 0) result += arr[u] + ' '; }
            return result.trim();
        }
        
        function convertNumber(val) {
            let result = '';
            const millions = Math.floor(val / 1000000);
            const thousands = Math.floor((val % 1000000) / 1000);
            const rest = val % 1000;
            if (millions > 0) {
                result += convertHundreds(millions) + ' ';
                const ld = millions % 10, lt = millions % 100;
                if (lt >= 11 && lt <= 19) result += 'миллионов ';
                else if (ld === 1) result += 'миллион ';
                else if (ld >= 2 && ld <= 4) result += 'миллиона ';
                else result += 'миллионов ';
            }
            if (thousands > 0) {
                result += convertHundreds(thousands, true) + ' ';
                const ld = thousands % 10, lt = thousands % 100;
                if (lt >= 11 && lt <= 19) result += 'тысяч ';
                else if (ld === 1) result += 'тысяча ';
                else if (ld >= 2 && ld <= 4) result += 'тысячи ';
                else result += 'тысяч ';
            }
            if (rest > 0) result += convertHundreds(rest);
            return result.trim();
        }
        return convertNumber(n);
    }
    
    // Строки таблицы товаров с фиксированной структурой
    let itemsRows = '';
    items.forEach((item, idx) => {
        const qty = Number(item.quantity_shipped) || Number(item.quantity_requested) || 0;
        const price = Number(item.price_per_unit) || 0;
        const amount = qty * price;
        const vat = amount * 0.2;
        const amountWithVat = amount + vat;
        const weight = qty * 2;
        
        itemsRows += `
            <tr style="border: 1px solid #000;">
                <td style="border: 1px solid #000; padding: 4px; text-align: center; width: 5%;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px; width: 30%;">${item.name || ''}${item.model ? ' ' + item.model : ''} (${item.unique_id || ''})</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; width: 5%;">шт</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; width: 8%;">${qty}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; width: 10%;">${price.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; width: 12%;">${amount.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; width: 5%;">20</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; width: 10%;">${vat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; width: 12%;">${amountWithVat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; width: 8%;">${weight.toFixed(2)}</td>
            </tr>
        `;
    });
    
    const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Товарно-транспортная накладная  ${documentNumber}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm 8mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 10pt; 
            margin: 0;
            padding: 0;
        }
        h1 { 
            font-size: 14pt; 
            text-align: center; 
            font-weight: bold; 
            margin: 0 0 5px 0; 
        }
        h2 { 
            font-size: 12pt; 
            text-align: center; 
            font-weight: normal; 
            margin: 0 0 15px 0; 
        }
        .bordered-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        .bordered-table th, .bordered-table td {
            border: 1px solid #000;
            padding: 6px 4px;
            vertical-align: middle;
        }
        .bordered-table th {
            font-weight: bold;
            text-align: center;
            background: #fff;
            font-size: 10pt;
        }
        .parties-table {
            width: 80%;
            margin: 0 auto 10px auto;
            border-collapse: collapse;
        }
        .parties-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: center;
            font-size: 10pt;
        }
        .field-row {
            margin-bottom: 8px;
        }
        .field-label {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 2px;
        }
        .field-line {
            border-bottom: 1px solid #000;
            padding: 4px 0 2px 5px;
            font-size: 10pt;
        }
        .field-hint {
            font-size: 8pt;
            color: #555;
            margin-top: 2px;
        }
        .inline-row {
            display: flex;
            gap: 20px;
            margin-bottom: 8px;
        }
        .inline-col {
            flex: 1;
        }
        .inline-label {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 2px;
        }
        .inline-line {
            border-bottom: 1px solid #000;
            padding: 4px 0 2px 5px;
            font-size: 10pt;
        }
        .inline-hint {
            font-size: 8pt;
            color: #555;
            margin-top: 2px;
        }
        .section-title { 
            font-size: 12pt; 
            font-weight: bold; 
            text-align: center; 
            margin: 15px 0 10px 0; 
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
    </style>
</head>
<body>

<h1>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ</h1>
<h2>№ ${documentNumber} от ${formattedDate}</h2>

<div style="text-align: center; margin-bottom: 8px;">
    <span style="font-weight: bold;">УНП</span>
</div>

<table class="parties-table">
    <tr>
        <td style="font-weight: bold; width: 33%;">Грузоотправитель</td>
        <td style="font-weight: bold; width: 33%;">Грузополучатель</td>
        <td style="font-weight: bold; width: 34%;">Заказчик (плательщик)</td>
    </tr>
    <tr>
        <td>332279933</td>
        <td>${request.customer_unp || ''}</td>
        <td>${request.customer_unp || ''}</td>
    </tr>
    <tr>
        <td>НПУП «АТОМТЕХ»,<br>220012, г. Минск, ул. Гикало, д. 5</td>
        <td>${request.customer_name || ''},<br>${request.customer_address || ''}</td>
        <td>${request.customer_name || ''},<br>${request.customer_address || ''}</td>
    </tr>
</table>

<div class="inline-row">
    <div class="inline-col">
        <div class="field-label">Автомобиль</div>
        <div class="field-line">${vehicleMake} ${vehicleNumber}</div>
        <div class="field-hint">(марка, регистрационный знак)</div>
    </div>
    <div class="inline-col">
        <div class="field-label">Прицеп</div>
        <div class="field-line">${trailerMake} ${trailerNumber}</div>
        <div class="field-hint">(марка, регистрационный знак)</div>
    </div>
    <div class="inline-col">
        <div class="field-label">К путевому листу №</div>
        <div class="field-line">${request.waybill_number_ttn || ''}</div>
    </div>
</div>

<div class="inline-row">
    <div class="inline-col">
        <div class="field-label">Водитель</div>
        <div class="field-line">${request.driver_name || ''}</div>
        <div class="field-hint">(фамилия, имя, отчество)</div>
    </div>
    <div class="inline-col">
        <div class="field-label">Доверенность</div>
        <div class="field-line">${request.power_of_attorney || ''}</div>
        <div class="field-hint">(номер, дата)</div>
    </div>
</div>

<div class="field-row">
    <div class="field-label">Грузоотправитель</div>
    <div class="field-line">НПУП «АТОМТЕХ», 220012, г. Минск, ул. Гикало, д. 5</div>
    <div class="field-hint">(наименование, адрес)</div>
</div>

<div class="field-row">
    <div class="field-label">Грузополучатель</div>
    <div class="field-line">${request.customer_name || ''}, ${request.customer_address || ''}</div>
    <div class="field-hint">(наименование, адрес)</div>
</div>

<div class="field-row">
    <div class="field-label">Заказчик автомобильной перевозки (плательщик)</div>
    <div class="field-line">${request.customer_name || ''}, ${request.customer_address || ''}</div>
    <div class="field-hint">(наименование, адрес)</div>
</div>

<div class="inline-row">
    <div class="inline-col">
        <div class="field-label">Основание отпуска</div>
        <div class="field-line">Договор поставки № ${request.contract_number || 'б/н'} от ${formattedDate}</div>
    </div>
    <div class="inline-col">
        <div class="field-label">Пункт погрузки</div>
        <div class="field-line">220012, г. Минск, ул. Гикало, д. 5</div>
    </div>
    <div class="inline-col">
        <div class="field-label">Пункт разгрузки</div>
        <div class="field-line">${request.customer_address || ''}</div>
    </div>
</div>

<div class="section-title">I. ТОВАРНЫЙ РАЗДЕЛ</div>

<table class="bordered-table">
    <thead>
        <tr>
            <th style="width: 5%;">№ п/п</th>
            <th style="width: 35%;">Наименование товара</th>
            <th style="width: 5%;">Ед.<br>изм</th>
            <th style="width: 7%;">Кол-во</th>
            <th style="width: 10%;">Цена,<br>руб.</th>
            <th style="width: 12%;">Сумма,<br>руб.</th>
            <th style="width: 5%;">НДС%</th>
            <th style="width: 10%;">Сумма НДС,<br>руб.</th>
            <th style="width: 12%;">Стоимость с НДС,<br>руб.</th>
            <th style="width: 8%;">Масса,<br>кг</th>
        </tr>
    </thead>
    <tbody>
        ${itemsRows}
        <tr style="font-weight: bold;">
            <td colspan="5" style="text-align: right;">ИТОГО:</td>
            <td style="text-align: right;">${finalTotalWithVat.toFixed(2)}</td>
            <td style="text-align: center;">&nbsp;</td>
            <td style="text-align: right;">&nbsp;</td>
            <td style="text-align: right;">&nbsp;</td>
            <td style="text-align: right;">${finalTotalWeight.toFixed(2)}</td>
        </tr>
    </tbody>
</table>

<div class="field-row">
    <div class="field-label">Всего сумма НДС</div>
    <div class="field-line">${finalTotalVat.toFixed(2)} руб. (${numToWords(finalTotalVat)} рублей ${Math.abs(Math.round((finalTotalVat % 1) * 100))} копеек)</div>
</div>

<div class="field-row">
    <div class="field-label">Всего стоимость с НДС</div>
    <div class="field-line">${finalTotalWithVat.toFixed(2)} руб. (${numToWords(finalTotalWithVat)} рублей ${Math.abs(Math.round((finalTotalWithVat % 1) * 100))} копеек)</div>
</div>

<div class="field-row">
    <div class="field-label">Всего масса груза</div>
    <div class="field-line">${finalTotalWeight.toFixed(2)} кг (${numToWords(finalTotalWeight)} килограмм)</div>
</div>

<div class="section-title">II. ПОГРУЗОЧНО-РАЗГРУЗОЧНЫЕ ОПЕРАЦИИ</div>

<table class="bordered-table">
    <thead>
        <tr>
            <th style="width: 20%;">Операция</th>
            <th style="width: 30%;">Исполнитель</th>
            <th style="width: 15%;">Способ</th>
            <th style="width: 15%;">Дата, время прибытия</th>
            <th style="width: 15%;">Дата, время убытия</th>
            <th style="width: 5%;">Время простоя</th>
        </tr>
    </thead>
    <tbody>
        ${isReplenishment ? `
        <tr>
            <td style="text-align: center;">Погрузка</td>
            <td>НПУП «АТОМТЕХ» (Производство)</td>
            <td style="text-align: center;">механизированный</td>
            <td style="text-align: center;">${pastDateTime}</td>
            <td style="text-align: center;">${pastDateTime}</td>
            <td style="text-align: center;">0</td>
        </tr>
        <tr>
            <td style="text-align: center;">Разгрузка</td>
            <td>НПУП «АТОМТЕХ» (Склад)</td>
            <td style="text-align: center;">механизированный</td>
            <td style="text-align: center;">${currentDateTime}</td>
            <td style="text-align: center;">${currentDateTime}</td>
            <td style="text-align: center;">0</td>
        </tr>
        ` : `
        <tr>
            <td style="text-align: center;">Погрузка</td>
            <td>НПУП «АТОМТЕХ»</td>
            <td style="text-align: center;">механизированный</td>
            <td style="text-align: center;"></td>
            <td style="text-align: center;">${currentDateTime}</td>
            <td style="text-align: center;">0</td>
        </tr>
        <tr>
            <td style="text-align: center;">Разгрузка</td>
            <td>${request.customer_name || 'Грузополучатель'}</td>
            <td style="text-align: center;">механизированный</td>
            <td style="text-align: center;"></td>
            <td style="text-align: center;"></td>
            <td style="text-align: center;"></td>
        </tr>
        `}
    </tbody>
</table>

<div class="field-row">
    <div class="field-label">Отпуск разрешил</div>
    <div class="field-line"></div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись)</div>
</div>

<div class="field-row">
    <div class="field-label">Сдал грузоотправитель</div>
    <div class="field-line">${completedByUser ? completedByUser.position + ' ' + completedByUser.full_name : ''}</div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись грузоотправителя)</div>
</div>

<div class="field-row">
    <div class="field-label">Товар к перевозке принял</div>
    <div class="field-line">Водитель ${request.driver_name || ''}</div>
    <div class="field-hint">(подпись)</div>
</div>

<div class="field-row">
    <div class="field-label">Принял грузополучатель</div>
    <div class="field-line"></div>
    <div class="field-hint">(должность, фамилия, инициалы, подпись грузополучателя)</div>
</div>

<div class="field-row">
    <div class="field-label">№ пломбы</div>
    <div class="field-line">${isReplenishment ? `ПЛ-${String(documentNumber).slice(-6)}` : ''}</div>
</div>

<div class="field-row">
    <div class="field-label">С товаром переданы документы</div>
    <div class="field-line">Товарно-транспортная накладная  ${documentNumber}</div>
</div>

</body>
</html>`;

    const blob = await htmlDocx.asBlob(fullHtml);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return buffer;
}

// Функция отправки email с учетными данными
async function sendUserCredentials(email, fullName, password, role) {
    try {
        const roleText = role === 'admin' ? 'Заведующий склада' : 
                         role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик';
        
        const loginUrl = process.env.APP_URL || 'http://localhost:5000';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .credentials { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                    .credential-item { margin: 10px 0; }
                    .label { font-weight: bold; color: #4b5563; }
                    .value { font-family: monospace; font-size: 16px; background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; }
                    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🏭 АТОМТЕХ Склад</h2>
                        <p>Доступ к системе</p>
                    </div>
                    <div class="content">
                        <p>Здравствуйте, <strong>${fullName}</strong>!</p>
                        <p>Вам предоставлен доступ к системе управления складом АТОМТЕХ.</p>
                        
                        <div class="credentials">
                            <div class="credential-item">
                                <span class="label">📧 Логин (Email):</span><br>
                                <span class="value">${email}</span>
                            </div>
                            <div class="credential-item">
                                <span class="label">🔐 Пароль:</span><br>
                                <span class="value">${password}</span>
                            </div>
                            <div class="credential-item">
                                <span class="label">👤 Роль:</span><br>
                                <span class="value">${roleText}</span>
                            </div>
                        </div>
                        
                        <p><strong>Важные рекомендации:</strong></p>
                        <ul>
                            <li>Не передавайте свои учетные данные третьим лицам</li>
                            <li>При возникновении проблем обратитесь к заведующему склада</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="${loginUrl}" class="button">🔗 Войти в систему</a>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.<br>
                            Это автоматическое сообщение, пожалуйста, не отвечайте на него.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
АТОМТЕХ Склад - Доступ к системе

Здравствуйте, ${fullName}!

Вам предоставлен доступ к системе управления складом АТОМТЕХ.

Логин (Email): ${email}
Пароль: ${password}
Роль: ${roleText}

Ссылка для входа: ${loginUrl}

Рекомендации:
- Не передавайте свои учетные данные третьим лицам

© 2026 НПУП «АТОМТЕХ»
        `;
        
        const info = await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"АТОМТЕХ Склад" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🔐 Доступ к системе АТОМТЕХ Склад - ${fullName}`,
            text: textContent,
            html: htmlContent
        });
        
        console.log(`Email отправлен на ${email}:`, info.messageId);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка отправки email:', error.message);
        return false;
    }
}

// Функция отправки уведомления об изменении данных пользователя
async function sendUserUpdateNotification(email, fullName, changes, changedBy) {
    try {
        const loginUrl = process.env.APP_URL || 'http://localhost:3000';
        
        let changesList = '';
        for (const [field, values] of Object.entries(changes)) {
            changesList += `<li><strong>${field}:</strong> ${values.old} → ${values.new}</li>`;
        }
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .changes { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                    .button { display: inline-block; background-color: #2563eb; color: white !important; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🏭 АТОМТЕХ Склад</h2>
                        <p>Обновление данных профиля</p>
                    </div>
                    <div class="content">
                        <p>Здравствуйте, <strong>${fullName}</strong>!</p>
                        <p>Заведующий сладом <strong>${changedBy}</strong> внес изменения в вашу учетную запись.</p>
                        
                        <div class="changes">
                            <h4>📝 Измененные данные:</h4>
                            <ul>
                                ${changesList}
                            </ul>
                        </div>
                        
                        <p>Если вы не ожидали этих изменений, пожалуйста, свяжитесь с заведующим склада.</p>
                        
                        <div style="text-align: center;">
                            <a href="${loginUrl}" class="button">🔗 Войти в систему</a>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
АТОМТЕХ Склад - Обновление данных профиля

Здравствуйте, ${fullName}!

Заведующий склада ${changedBy} внес изменения в вашу учетную запись.

Измененные данные:
${Object.entries(changes).map(([field, values]) => `- ${field}: ${values.old} → ${values.new}`).join('\n')}

Если вы не ожидали этих изменений, пожалуйста, свяжитесь с заведующему склада.

Ссылка для входа: ${loginUrl}

© 2026 НПУП «АТОМТЕХ»
        `;
        
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"АТОМТЕХ Склад" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `📝 Обновление данных профиля - АТОМТЕХ Склад`,
            text: textContent,
            html: htmlContent
        });
        
        console.log(`Уведомление об изменении данных отправлено на ${email}`);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления об изменении:', error.message);
        return false;
    }
}

// Функция отправки уведомления о сбросе пароля
async function sendPasswordResetNotification(email, fullName, newPassword, changedBy) {
    try {
        const loginUrl = process.env.APP_URL || 'http://localhost:3000';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .new-password { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #f59e0b; }
                    .password-value { font-family: monospace; font-size: 20px; font-weight: bold; color: #d97706; }
                    .button { display: inline-block; background-color: #2563eb; color: white !important; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🏭 АТОМТЕХ Склад</h2>
                        <p>Сброс пароля</p>
                    </div>
                    <div class="content">
                        <p>Здравствуйте, <strong>${fullName}</strong>!</p>
                        <p>Заведующий склада <strong>${changedBy}</strong> сбросил ваш пароль.</p>
                        
                        <div class="new-password">
                            <h4>🔐 Ваш новый пароль:</h4>
                            <div class="password-value">${newPassword}</div>
                        </div>
                        
                        <p><strong>Рекомендации:</strong></p>
                        <ul>
                            <li>Не передавайте пароль третьим лицам</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="${loginUrl}" class="button">🔗 Войти в систему</a>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
АТОМТЕХ Склад - Сброс пароля

Здравствуйте, ${fullName}!

Заведующий склада ${changedBy} сбросил ваш пароль.

Ваш новый пароль: ${newPassword}

Рекомендации:
- Не передавайте пароль третьим лицам

Ссылка для входа: ${loginUrl}

© 2026 НПУП «АТОМТЕХ»
        `;
        
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"АТОМТЕХ Склад" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🔐 Сброс пароля - АТОМТЕХ Склад`,
            text: textContent,
            html: htmlContent
        });
        
        console.log(`Уведомление о сбросе пароля отправлено на ${email}`);
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки уведомления о сбросе пароля:', error.message);
        return false;
    }
}

// Функция отправки уведомления об изменении статуса (активен/неактивен)
async function sendStatusChangeNotification(email, fullName, isActive, changedBy) {
    try {
        const loginUrl = process.env.APP_URL || 'http://localhost:3000';
        const statusText = isActive ? 'активирована' : 'деактивирована';
        const statusColor = isActive ? '#10b981' : '#ef4444';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .status { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
                    .button { display: inline-block; background-color: #2563eb; color: white !important; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🏭 АТОМТЕХ Склад</h2>
                        <p>Изменение статуса учетной записи</p>
                    </div>
                    <div class="content">
                        <p>Здравствуйте, <strong>${fullName}</strong>!</p>
                        <p>Заведующий склада <strong>${changedBy}</strong> ${statusText} вашу учетную запись.</p>
                        
                        <div class="status">
                            ${isActive ? 'Ваша учетная запись АКТИВИРОВАНА' : 'Ваша учетная запись ДЕАКТИВИРОВАНА'}
                        </div>
                        
                        ${isActive ? `
                        <div style="text-align: center;">
                            <a href="${loginUrl}" class="button">🔗 Войти в систему</a>
                        </div>
                        ` : '<p>Если у вас есть вопросы, пожалуйста, свяжитесь с заведующим склада.</p>'}
                        
                        <div class="footer">
                            <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
АТОМТЕХ Склад - Изменение статуса учетной записи

Здравствуйте, ${fullName}!

Заведующий склада ${changedBy} ${statusText} вашу учетную запись.

${isActive ? `Ссылка для входа: ${loginUrl}` : 'Если у вас есть вопросы, пожалуйста, свяжитесь с заведующим склада.'}

© 2026 НПУП «АТОМТЕХ»
        `;
        
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"АТОМТЕХ Склад" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `📋 Изменение статуса учетной записи - АТОМТЕХ Склад`,
            text: textContent,
            html: htmlContent
        });
        
        console.log(`Уведомление об изменении статуса отправлено на ${email}`);
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки уведомления об изменении статуса:', error.message);
        return false;
    }
}

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения (JPEG, PNG, GIF, WEBP) и PDF разрешены'));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Путь к статическим файлам
const clientPath = path.join(__dirname, 'client');
console.log('📁 Путь к клиенту:', clientPath);
app.use(express.static(clientPath));

// Создаем папку client если её нет
if (!fs.existsSync(clientPath)) {
    fs.mkdirSync(clientPath, { recursive: true });
    console.log('✅ Папка client создана');
}

// Конфигурация базы данных
const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'AtomtechWarehouse',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrongPassword123',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 120000,   // 2 минуты
        requestTimeout: 120000,    // 2 минуты
        cancelTimeout: 60000 
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let dbPool;
let isDatabaseConnected = false;

// Подключение к базе данных
async function connectDB() {
    try {
        console.log('🔗 Подключение к базе данных...');
        console.log('📊 Конфигурация:', {
            server: dbConfig.server,
            database: dbConfig.database,
            user: dbConfig.user
        });
        
        dbPool = await sql.connect(dbConfig);
        isDatabaseConnected = true;
        console.log('✅ База данных подключена');
        
        const tables = await dbPool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        console.log('📋 Таблицы в базе:', tables.recordset.map(t => t.TABLE_NAME).join(', '));
        
        const result = await dbPool.request().query('SELECT COUNT(*) as count FROM tbl_Users');
        console.log(`👥 Пользователей в базе: ${result.recordset[0].count}`);
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к БД:', error.message);
        console.error('Детали ошибки:', error);
        isDatabaseConnected = false;
        return false;
    }
}

// Middleware проверки токена
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        console.log('❌ Нет токена авторизации');
        return res.status(401).json({ 
            success: false, 
            message: 'Требуется авторизация' 
        });
    }
    
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'atomtech-secret-key');
        req.user = decoded;
        console.log(`✅ Токен проверен для пользователя: ${decoded.email} (роль: ${decoded.role})`);
        next();
    } catch (error) {
        console.error('❌ Ошибка проверки токена:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Неверный токен' 
        });
    }
}

// Middleware проверки роли администратора
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Доступ запрещен. Требуются права заведующего склада'
        });
    }
    next();
}

// Middleware проверки роли менеджера
function requireManager(req, res, next) {
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Доступ запрещен. Требуются права менеджера'
        });
    }
    next();
}

// Middleware проверки роли сотрудника
function requireEmployee(req, res, next) {
    if (req.user.role !== 'employee' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Доступ запрещен. Требуются права сотрудника'
        });
    }
    next();
}
function sanitizeText(text) {
    if (!text) return '';
    return text.replace(/[^\w\s\.,\-«»\(\)]/g, '');
}

// 1. Проверка сервера
app.get('/api/health', (req, res) => {
    console.log('✅ Запрос /api/health');
    res.json({
        success: true,
        service: 'АТОМТЕХ Склад',
        version: '6.8',
        database_connected: isDatabaseConnected,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/notifications', verifyToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const notifications = await getUserNotifications(req.user.id, limit);
        const unreadCount = await getUnreadNotificationsCount(req.user.id);
        
        // Дополнительное форматирование на всякий случай
        const formattedNotifications = notifications.map(notif => ({
            ...notif,
            created_at_formatted: new Date(notif.created_at).toLocaleDateString()
        }));
        
        res.json({
            success: true,
            notifications: formattedNotifications,
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('Ошибка получения уведомлений:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения уведомлений'
        });
    }
});

// Отметка уведомления как прочитанного
app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        await markNotificationAsRead(notificationId, req.user.id);
        
        res.json({
            success: true,
            message: 'Уведомление отмечено как прочитанное'
        });
    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка отметки уведомления'
        });
    }
});

// Отметка всех уведомлений как прочитанных
app.put('/api/notifications/read-all', verifyToken, async (req, res) => {
    try {
        await markAllNotificationsAsRead(req.user.id);
        
        res.json({
            success: true,
            message: 'Все уведомления отмечены как прочитанные'
        });
    } catch (error) {
        console.error('Ошибка отметки уведомлений:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка отметки уведомлений'
        });
    }
});

// Удаление уведомления
app.delete('/api/notifications/:id', verifyToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        
        const result = await dbPool.request()
            .input('id', sql.Int, notificationId)
            .input('userId', sql.Int, req.user.id)
            .query(`
                DELETE FROM tbl_Notifications 
                WHERE id = @id AND user_id = @userId
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Уведомление не найдено'
            });
        }
        
        res.json({
            success: true,
            message: 'Уведомление удалено'
        });
        
    } catch (error) {
        console.error('Ошибка удаления уведомления:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления уведомления'
        });
    }
});

app.get('/api/users/list', async (req, res) => {
    try {
        const result = await dbPool.request().query(`
            SELECT 
                id, 
                email, 
                last_name,
                first_name,
                middle_name,
                CONCAT(last_name, ' ', first_name, ISNULL(' ' + middle_name, '')) as full_name,
                role,
                phone
            FROM tbl_Users 
            WHERE is_active = 1 AND is_deleted = 0
            ORDER BY last_name, first_name
        `);
        
        res.json({
            success: true,
            users: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения списка пользователей:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения списка пользователей' });
    }
});

// 2. АВТОРИЗАЦИЯ
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log(`🔐 Попытка входа: ${email}`);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Укажите email и пароль'
            });
        }
        
        if (!isDatabaseConnected) {
            return res.status(503).json({
                success: false,
                message: 'База данных недоступна'
            });
        }
        
        const result = await dbPool.request()
            .input('Email', sql.NVarChar, email)
            .input('Password', sql.NVarChar, password)
            .execute('sp_AuthenticateUser');
        
        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Ошибка аутентификации'
            });
        }
        
        const userData = result.recordset[0];
        
        if (userData.ErrorMessage) {
            return res.status(401).json({
                success: false,
                message: userData.ErrorMessage
            });
        }
        
        const token = jwt.sign(
            {
                id: userData.UserId,
                email: email,
                full_name: userData.FullName,
                role: userData.Role
            },
            process.env.JWT_SECRET || 'atomtech-secret-key',
            { expiresIn: '24h' }
        );
        
        console.log(`✅ Успешный вход: ${userData.FullName} (${userData.Role})`);
        
        res.json({
            success: true,
            token: token,
            user: {
                id: userData.UserId,
                email: email,
                full_name: userData.FullName,
                role: userData.Role,
                department: userData.Department,
                position: userData.Position
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// 3. ПОЛУЧЕНИЕ ПРАВ ПОЛЬЗОВАТЕЛЯ
app.get('/api/user/permissions', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('UserId', sql.Int, req.user.id)
            .execute('sp_GetUserPermissions');
        
        res.json({
            success: true,
            permissions: result.recordset[0]
        });
    } catch (error) {
        console.error('Ошибка получения прав:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения прав'
        });
    }
});

// 4. ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ
app.get('/api/user/info', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('UserId', sql.Int, req.user.id)
            .query(`
                SELECT 
                    id, 
                    email, 
                    last_name,
                    first_name,
                    middle_name,
                    CONCAT(last_name, ' ', first_name, ISNULL(' ' + middle_name, '')) as full_name,
                    role, 
                    phone, 
                    created_at, 
                    last_login
                FROM tbl_Users 
                WHERE id = @UserId
            `);
        
        res.json({
            success: true,
            user: result.recordset[0]
        });
    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения информации о пользователе' });
    }
});

// 5. СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ
app.get('/api/user/stats', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('user_id', sql.Int, req.user.id)
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM tbl_Devices WHERE created_by = @user_id) as devices_added,
                    (SELECT COUNT(*) FROM tbl_StockMovements WHERE performed_by = @user_id) as total_operations,
                    (SELECT COUNT(*) FROM tbl_ReplenishmentRequests WHERE created_by = @user_id) as replenishment_requests,
                    (SELECT COUNT(*) FROM tbl_ShipmentRequests WHERE created_by = @user_id) as shipment_requests_created,
                    (SELECT COUNT(*) FROM tbl_ShipmentRequests WHERE processed_by = @user_id) as shipment_requests_processed,
                    (SELECT COUNT(*) FROM tbl_Contracts WHERE created_by = @user_id) as contracts_created,
                    (SELECT COUNT(*) FROM tbl_Inventory WHERE created_by = @user_id) as inventories_created
            `);
        
        res.json({
            success: true,
            stats: result.recordset[0]
        });
    } catch (error) {
        console.error('Ошибка получения статистики пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

app.get('/api/user/activity', verifyToken, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const result = await dbPool.request()
            .input('user_id', sql.Int, req.user.id)
            .input('limit', sql.Int, parseInt(limit))
            .query(`
                SELECT TOP (@limit)
                    FORMAT(sm.movement_date, 'dd.MM.yyyy') as date,
                    'Движение' as type,
                    d.name as object_name,
                    sm.movement_type as action,
                    sm.quantity_change as quantity,
                    sm.notes as details
                FROM tbl_StockMovements sm
                JOIN tbl_Devices d ON sm.device_id = d.id
                WHERE sm.performed_by = @user_id
                
                UNION ALL
                
                SELECT TOP (@limit)
                    FORMAT(rr.created_at, 'dd.MM.yyyy') as date,
                    'Заявка на пополнение' as type,
                    rr.request_number as object_name,
                    'Создание заявки' as action,
                    rr.quantity_requested as quantity,
                    rr.reason as details
                FROM tbl_ReplenishmentRequests rr
                WHERE rr.created_by = @user_id
                
                UNION ALL
                
                SELECT TOP (@limit)
                    FORMAT(sr.created_at, 'dd.MM.yyyy') as date,
                    'Заявка на отгрузку' as type,
                    sr.request_number as object_name,
                    'Создание заявки' as action,
                    NULL as quantity,
                    sr.customer_name as details
                FROM tbl_ShipmentRequests sr
                WHERE sr.created_by = @user_id
                
                UNION ALL
                
                SELECT TOP (@limit)
                    FORMAT(sr.processed_at, 'dd.MM.yyyy') as date,
                    'Заявка на отгрузку' as type,
                    sr.request_number as object_name,
                    'Обработка заявки' as action,
                    NULL as quantity,
                    CONCAT('Авто: ', sr.vehicle_number, ', Вод: ', 
                           sr.driver_last_name, ' ', sr.driver_first_name, ISNULL(' ' + sr.driver_middle_name, '')) as details
                FROM tbl_ShipmentRequests sr
                WHERE sr.processed_by = @user_id AND sr.processed_at IS NOT NULL
                
                UNION ALL
                
                SELECT TOP (@limit)
                    FORMAT(sr.completed_at, 'dd.MM.yyyy') as date,
                    'Заявка на отгрузку' as type,
                    sr.request_number as object_name,
                    'Отгрузка выполнена' as action,
                    NULL as quantity,
                    CONCAT('ТН: ', sr.waybill_number, ', ТТН: ', sr.ttn_number) as details
                FROM tbl_ShipmentRequests sr
                WHERE sr.completed_by = @user_id AND sr.completed_at IS NOT NULL
                
                UNION ALL
                
                SELECT TOP (@limit)
                    FORMAT(c.created_at, 'dd.MM.yyyy') as date,
                    'Договор' as type,
                    c.contract_number as object_name,
                    'Создание договора' as action,
                    NULL as quantity,
                    c.notes as details
                FROM tbl_Contracts c
                WHERE c.created_by = @user_id
                
                UNION ALL
                
                SELECT TOP (@limit)
                    FORMAT(i.created_at, 'dd.MM.yyyy') as date,
                    'Инвентаризация' as type,
                    i.inventory_number as object_name,
                    'Создание' as action,
                    NULL as quantity,
                    i.notes as details
                FROM tbl_Inventory i
                WHERE i.created_by = @user_id
                
                ORDER BY date DESC
            `);
        
        res.json({
            success: true,
            activities: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения активности пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения активности'
        });
    }
});

app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT 
                    id, 
                    email, 
                    last_name,
                    first_name,
                    middle_name,
                    CONCAT(last_name, ' ', first_name, ISNULL(' ' + middle_name, '')) as full_name,
                    role, 
                    phone, 
                    created_at, 
                    last_login, 
                    is_active
                FROM tbl_Users 
                WHERE is_deleted = 0
                ORDER BY created_at DESC
            `);
        
        res.json({
            success: true,
            users: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения пользователей' });
    }
});
// 8. СОЗДАНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ (с отправкой email)
app.post('/api/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { 
            email, 
            password, 
            last_name, 
            first_name, 
            middle_name, 
            role, 
            phone, 
            sendEmail = true 
        } = req.body;
        
        // Валидация
        if (!email || !password || !last_name || !first_name || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Укажите email, пароль, фамилию, имя и роль' 
            });
        }
        
        // Проверка длины
        if (email.length > 100) {
            return res.status(400).json({ success: false, message: 'Email не должен превышать 100 символов' });
        }
        
        if (last_name.length > 50 || first_name.length > 50 || (middle_name && middle_name.length > 50)) {
            return res.status(400).json({ success: false, message: 'ФИО не должно превышать 50 символов в каждой части' });
        }
        
        if (password.length < 6 || password.length > 100) {
            return res.status(400).json({ success: false, message: 'Пароль должен быть от 6 до 100 символов' });
        }
        
        // Проверяем, не существует ли уже пользователь
        const checkUser = await dbPool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT id FROM tbl_Users WHERE email = @Email');
        
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' });
        }
        
        // Формируем ФИО для письма
        const fullName = `${last_name} ${first_name}${middle_name ? ' ' + middle_name : ''}`;
        
        // Создаем пользователя
        const result = await dbPool.request()
            .input('Email', sql.NVarChar, email)
            .input('Password', sql.NVarChar, password)
            .input('LastName', sql.NVarChar, last_name)
            .input('FirstName', sql.NVarChar, first_name)
            .input('MiddleName', sql.NVarChar, middle_name || null)
            .input('Role', sql.NVarChar, role)
            .input('Phone', sql.NVarChar, phone || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .execute('sp_CreateUser');
        
        const procResult = result.recordset[0];
        
        if (procResult.Success === 1) {
            let emailSent = false;
            if (sendEmail && email) {
                emailSent = await sendUserCredentials(email, fullName, password, role);
            }
            
            res.status(201).json({
                success: true,
                message: emailSent ? 'Пользователь создан, данные отправлены на email' : 'Пользователь создан, но email не отправлен',
                emailSent: emailSent
            });
        } else {
            res.status(400).json({ success: false, message: procResult.Message });
        }
        
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания пользователя: ' + error.message });
    }
});

app.put('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { email, last_name, first_name, middle_name, role, phone, is_active } = req.body;
        
        // Валидация email (прямая проверка без отдельной функции)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email обязателен' });
        }
        
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Некорректный email' });
        }
        
        if (email.length > 100) {
            return res.status(400).json({ success: false, message: 'Email не должен превышать 100 символов' });
        }
        
        // Получаем старые данные пользователя до обновления
        const oldUserData = await dbPool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT email, last_name, first_name, middle_name, role, phone, is_active 
                FROM tbl_Users 
                WHERE id = @UserId
            `);
        
        if (oldUserData.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        const oldUser = oldUserData.recordset[0];
        
        // Проверяем, не занят ли email другим пользователем
        const checkEmail = await dbPool.request()
            .input('Email', sql.NVarChar, email)
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT id FROM tbl_Users WHERE email = @Email AND id != @UserId
            `);
        
        if (checkEmail.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' });
        }
        
        // Обновляем пользователя
        const result = await dbPool.request()
            .input('UserId', sql.Int, userId)
            .input('Email', sql.NVarChar, email)
            .input('LastName', sql.NVarChar, last_name)
            .input('FirstName', sql.NVarChar, first_name)
            .input('MiddleName', sql.NVarChar, middle_name || null)
            .input('Role', sql.NVarChar, role)
            .input('Phone', sql.NVarChar, phone || null)
            .input('IsActive', sql.Bit, is_active)
            .query(`
                UPDATE tbl_Users 
                SET email = @Email,
                    last_name = @LastName,
                    first_name = @FirstName,
                    middle_name = @MiddleName,
                    role = @Role,
                    phone = @Phone,
                    is_active = @IsActive
                WHERE id = @UserId
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Собираем изменения
        const changes = {};
        const oldFullName = `${oldUser.last_name} ${oldUser.first_name}${oldUser.middle_name ? ' ' + oldUser.middle_name : ''}`;
        const newFullName = `${last_name} ${first_name}${middle_name ? ' ' + middle_name : ''}`;
        
        if (oldUser.email !== email) {
            changes['Email'] = { old: oldUser.email, new: email };
        }
        if (oldFullName !== newFullName) {
            changes['ФИО'] = { old: oldFullName, new: newFullName };
        }
        if (oldUser.role !== role) {
            const roleMap = { 'admin': 'Заведующий склада', 'manager': 'Менеджер по продажам', 'employee': 'Кладовщик' };
            changes['Роль'] = { old: roleMap[oldUser.role] || oldUser.role, new: roleMap[role] || role };
        }
        if ((oldUser.phone || '') !== (phone || '')) {
            changes['Телефон'] = { old: oldUser.phone || '-', new: phone || '-' };
        }
        
        // Отправляем уведомление об изменении данных
        if (Object.keys(changes).length > 0) {
            await sendUserUpdateNotification(email, newFullName, changes, req.user.full_name);
        }
        
        // Отправляем уведомление об изменении статуса
        if (oldUser.is_active !== is_active) {
            await sendStatusChangeNotification(email, newFullName, is_active === 1, req.user.full_name);
        }
        
        res.json({ success: true, message: 'Пользователь обновлен, уведомления отправлены' });
        
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка обновления пользователя: ' + error.message });
    }
});

// 10. СБРОС ПАРОЛЯ ПОЛЬЗОВАТЕЛЯ (с отправкой уведомления)
app.post('/api/users/:id/reset-password', verifyToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Укажите новый пароль'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Пароль должен быть не менее 6 символов'
            });
        }
        
        if (newPassword.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Пароль не должен превышать 100 символов'
            });
        }
        
        // Получаем данные пользователя до сброса пароля
        const userData = await dbPool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT email, CONCAT(last_name, ' ', first_name, ISNULL(' ' + middle_name, '')) as full_name
                FROM tbl_Users 
                WHERE id = @UserId
            `);
        
        if (userData.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const user = userData.recordset[0];
        
        // Сбрасываем пароль
        const result = await dbPool.request()
            .input('UserId', sql.Int, userId)
            .input('NewPassword', sql.NVarChar, newPassword)
            .execute('sp_ResetPassword');
        
        const procResult = result.recordset[0];
        
        if (procResult.Success === 1) {
            // Отправляем уведомление о сбросе пароля
            await sendPasswordResetNotification(
                user.email,
                user.full_name,
                newPassword,
                req.user.full_name
            );
            
            res.json({
                success: true,
                message: 'Пароль успешно сброшен, новый пароль отправлен пользователю на email'
            });
        } else {
            res.json({
                success: false,
                message: procResult.Message
            });
        }
        
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сброса пароля: ' + error.message
        });
    }
});

app.delete('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Получаем данные пользователя
        const userData = await dbPool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT email, CONCAT(last_name, ' ', first_name, ISNULL(' ' + middle_name, '')) as full_name
                FROM tbl_Users 
                WHERE id = @UserId AND is_deleted = 0
            `);
        
        if (userData.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        const userToArchive = userData.recordset[0];
        
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Нельзя архивировать свою учетную запись'
            });
        }
        
        // Отправляем уведомление об архивации
        await sendUserArchivedNotification(
            userToArchive.email,
            userToArchive.full_name,
            req.user.full_name
        );
        
        // Архивируем пользователя (не удаляем!)
        await dbPool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                UPDATE tbl_Users 
                SET is_deleted = 1,
                    is_active = 0,
                    email = CONCAT('archived_', id, '_', email)
                WHERE id = @UserId
            `);
        
        // Очищаем внешние ключи (обнуляем ссылки)
        await dbPool.request()
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE tbl_Devices SET created_by = NULL WHERE created_by = @userId;
                UPDATE tbl_Devices SET updated_by = NULL WHERE updated_by = @userId;
                UPDATE tbl_Stock SET last_updated_by = NULL WHERE last_updated_by = @userId;
                UPDATE tbl_StockMovements SET performed_by = NULL WHERE performed_by = @userId;
                UPDATE tbl_ShipmentRequests SET created_by = NULL WHERE created_by = @userId;
                UPDATE tbl_ShipmentRequests SET processed_by = NULL WHERE processed_by = @userId;
                UPDATE tbl_ShipmentRequests SET completed_by = NULL WHERE completed_by = @userId;
                UPDATE tbl_ShipmentRequests SET assigned_to = NULL WHERE assigned_to = @userId;
                UPDATE tbl_ReplenishmentRequests SET created_by = NULL WHERE created_by = @userId;
                UPDATE tbl_ReplenishmentRequests SET approved_by = NULL WHERE approved_by = @userId;
                UPDATE tbl_Contracts SET created_by = NULL WHERE created_by = @userId;
                UPDATE tbl_Inventory SET created_by = NULL WHERE created_by = @userId;
                UPDATE tbl_Inventory SET completed_by = NULL WHERE completed_by = @userId;
                UPDATE tbl_DeviceImages SET uploaded_by = NULL WHERE uploaded_by = @userId;
                DELETE FROM tbl_Notifications WHERE user_id = @userId;
            `);
        
        res.json({
            success: true,
            message: 'Пользователь архивирован'
        });
        
    } catch (error) {
        console.error('Ошибка архивации пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка архивации пользователя: ' + error.message
        });
    }
});
async function sendUserArchivedNotification(email, fullName, archivedBy) {
    try {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>АТОМТЕХ Склад</h2>
                        <p>Архивация учетной записи</p>
                    </div>
                    <div class="content">
                        <p>Здравствуйте, <strong>${escapeHtml(fullName)}</strong>!</p>
                        <p>Заведующий склада <strong>${escapeHtml(archivedBy)}</strong> архивировал вашу учетную запись в системе АТОМТЕХ Склад.</p>
                        <p>Вы больше не имеете доступа к системе.</p>
                        <p>Если это произошло по ошибке или у вас есть вопросы, пожалуйста, свяжитесь с заведующим склада.</p>
                        <div class="footer">
                            <p>© 2026 НПУП «АТОМТЕХ». Система управления складом.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
АТОМТЕХ Склад - Архивация учетной записи

Здравствуйте, ${fullName}!

Заведующий склада ${archivedBy} архивировал вашу учетную запись в системе АТОМТЕХ Склад.

Вы больше не имеете доступа к системе.

Если это произошло по ошибке или у вас есть вопросы, пожалуйста, свяжитесь с заведующим склада.

© 2026 НПУП «АТОМТЕХ»
        `;
        
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"АТОМТЕХ Склад" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `📦 Архивация учетной записи - АТОМТЕХ Склад`,
            text: textContent,
            html: htmlContent
        });
        
        console.log(`Уведомление об архивации отправлено на ${email}`);
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки уведомления об архивации:', error.message);
        return false;
    }
}

async function sendUserDeletionNotification(email, fullName, deletedBy) {
    try {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🏭 АТОМТЕХ Склад</h2>
                        <p>Удаление учетной записи</p>
                    </div>
                    <div class="content">
                        <p>Здравствуйте, <strong>${escapeHtml(fullName)}</strong>!</p>
                        <p>Заведующий склада <strong>${escapeHtml(deletedBy)}</strong> удалил вашу учетную запись из системы АТОМТЕХ Склад.</p>
                        <p>Вы больше не имеете доступа к системе.</p>
                        <p>Если это произошло по ошибке или у вас есть вопросы, пожалуйста, свяжитесь с заведующим склада.</p>
                        <div class="footer">
                            <p>© 2026 НПУП «АТОМТЕХ». Система управления склада.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textContent = `
АТОМТЕХ Склад - Удаление учетной записи

Здравствуйте, ${fullName}!

Заведующий склада ${deletedBy} удалил вашу учетную запись из системы АТОМТЕХ Склад.

Вы больше не имеете доступа к системе.

Если это произошло по ошибке или у вас есть вопросы, пожалуйста, свяжитесь с заведующим склада.

© 2026 НПУП «АТОМТЕХ»
        `;
        
        await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || `"АТОМТЕХ Склад" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `⚠️ Удаление учетной записи - АТОМТЕХ Склад`,
            text: textContent,
            html: htmlContent
        });
        
        console.log(`Уведомление об удалении отправлено на ${email}`);
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки уведомления об удалении:', error.message);
        return false;
    }
}

// 12. ПОЛУЧЕНИЕ ПРИБОРОВ С РАСШИРЕННОЙ ФИЛЬТРАЦИЕЙ
app.get('/api/devices', verifyToken, async (req, res) => {
    try {
        const { 
            search = '', 
            category = 'all', 
            stockStatus = 'all',
            manufacturer = 'all',
            minPrice,
            maxPrice,
            page = 1, 
            pageSize = 50,
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;
        
        console.log('📊 Запрос приборов с фильтрами:', { search, category, stockStatus, manufacturer, minPrice, maxPrice, sortBy, sortOrder });
        
        // Базовый SQL запрос с JOIN для получения данных о приборах и остатках
        let query = `
            SELECT 
                d.id,
                d.unique_id,
                d.name,
                d.category,
                d.description,
                d.manufacturer,
                d.model,
                d.specifications,
                d.price,
                d.created_at,
                CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as created_by_name,
                ISNULL(s.quantity, 0) as quantity,
                ISNULL(s.min_quantity, 5) as min_quantity,
                s.max_quantity,
                s.location,
                s.shelf,
                s.notes as stock_notes,
                s.last_updated,
                COUNT(*) OVER() as total_count
            FROM tbl_Devices d
            LEFT JOIN tbl_Users u ON d.created_by = u.id
            LEFT JOIN tbl_Stock s ON d.id = s.device_id
            WHERE d.status = 'active' AND d.is_deleted = 0
        `;
        
        const request = dbPool.request();
        
        // 1. ПОИСК ПО ТЕКСТУ
        if (search && search.trim() !== '') {
            query += ` AND (
                d.unique_id LIKE @search 
                OR d.name LIKE @search 
                OR d.model LIKE @search 
                OR d.manufacturer LIKE @search
            )`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        
        // 2. ФИЛЬТР ПО КАТЕГОРИИ
        if (category && category !== 'all') {
            query += ` AND d.category = @category`;
            request.input('category', sql.NVarChar, category);
        }
        
        // 3. ФИЛЬТР ПО ПРОИЗВОДИТЕЛЮ
        if (manufacturer && manufacturer !== 'all') {
            query += ` AND d.manufacturer = @manufacturer`;
            request.input('manufacturer', sql.NVarChar, manufacturer);
        }
        
        // 4. ФИЛЬТР ПО СТАТУСУ НАЛИЧИЯ
        if (stockStatus && stockStatus !== 'all') {
            if (stockStatus === 'in_stock') {
                query += ` AND ISNULL(s.quantity, 0) > ISNULL(s.min_quantity, 5)`;
            } else if (stockStatus === 'low_stock') {
                query += ` AND ISNULL(s.quantity, 0) > 0 AND ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5)`;
            } else if (stockStatus === 'out_of_stock') {
                query += ` AND ISNULL(s.quantity, 0) = 0`;
            }
        }
        
        // 5. ФИЛЬТР ПО ДИАПАЗОНУ ЦЕН
        if (minPrice && !isNaN(parseFloat(minPrice))) {
            query += ` AND d.price >= @minPrice`;
            request.input('minPrice', sql.Decimal(18,2), parseFloat(minPrice));
        }
        
        if (maxPrice && !isNaN(parseFloat(maxPrice))) {
            query += ` AND d.price <= @maxPrice`;
            request.input('maxPrice', sql.Decimal(18,2), parseFloat(maxPrice));
        }
        
        // 6. СОРТИРОВКА
        let orderByClause = '';
        switch(sortBy) {
            case 'name':
                orderByClause = `ORDER BY d.name ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
                break;
            case 'price':
                orderByClause = `ORDER BY d.price ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
                break;
            case 'quantity':
                orderByClause = `ORDER BY ISNULL(s.quantity, 0) ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
                break;
            case 'created_at':
                orderByClause = `ORDER BY d.created_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
                break;
            default:
                orderByClause = `ORDER BY d.name ASC`;
        }
        
        // 7. ПАГИНАЦИЯ
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        query += ` ${orderByClause} OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;
        
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            devices: result.recordset,
            total: result.recordset.length > 0 ? result.recordset[0].total_count : 0,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
        
    } catch (error) {
        console.error('❌ Ошибка получения приборов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера: ' + error.message
        });
    }
});

// 13. ПОЛУЧЕНИЕ ПРИБОРА ПО ID
app.get('/api/devices/:id', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM vw_DeviceDetails WHERE id = @id`);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Прибор не найден'
            });
        }
        
        res.json({
            success: true,
            device: result.recordset[0]
        });
    } catch (error) {
        console.error('Ошибка получения прибора:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// 14. ДОБАВЛЕНИЕ ПРИБОРА
app.post('/api/devices', verifyToken, async (req, res) => {
    try {
        const deviceData = req.body;
        
        const result = await dbPool.request()
            .input('UniqueId', sql.NVarChar, deviceData.unique_id)
            .input('Name', sql.NVarChar, deviceData.name)
            .input('Category', sql.NVarChar, deviceData.category || null)
            .input('Description', sql.NVarChar, deviceData.description || null)
            .input('Manufacturer', sql.NVarChar, deviceData.manufacturer || 'НПУП «АТОМТЕХ»')
            .input('Model', sql.NVarChar, deviceData.model || null)
            .input('Price', sql.Decimal(18,2), deviceData.price || 0)
            .input('Specifications', sql.NVarChar, deviceData.specifications ? 
                (typeof deviceData.specifications === 'string' ? deviceData.specifications : JSON.stringify(deviceData.specifications)) 
                : null)
            .input('Quantity', sql.Int, deviceData.quantity || 0)
            .input('MinQuantity', sql.Int, deviceData.min_quantity || 5)
            .input('Location', sql.NVarChar, deviceData.location || null)
            .input('Shelf', sql.NVarChar, deviceData.shelf || null)
            .input('StockNotes', sql.NVarChar, deviceData.stock_notes || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .execute('sp_CreateDevice');
        
        const procResult = result.recordset[0];
        
        res.status(201).json({
            success: procResult.Success === 1,
            deviceId: procResult.DeviceId,
            message: procResult.Message
        });
        
    } catch (error) {
        console.error('Ошибка добавления прибора:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при добавлении прибора: ' + error.message
        });
    }
});

// 15. ОБНОВЛЕНИЕ ПРИБОРА
app.put('/api/devices/:id', verifyToken, async (req, res) => {
    try {
        const deviceId = req.params.id;
        const deviceData = req.body;
        
        const result = await dbPool.request()
            .input('DeviceId', sql.Int, deviceId)
            .input('UniqueId', sql.NVarChar, deviceData.unique_id)
            .input('Name', sql.NVarChar, deviceData.name)
            .input('Category', sql.NVarChar, deviceData.category || null)
            .input('Description', sql.NVarChar, deviceData.description || null)
            .input('Manufacturer', sql.NVarChar, deviceData.manufacturer || 'НПУП «АТОМТЕХ»')
            .input('Model', sql.NVarChar, deviceData.model || null)
            .input('Price', sql.Decimal(18,2), deviceData.price || 0)
            .input('Specifications', sql.NVarChar, deviceData.specifications ? 
                (typeof deviceData.specifications === 'string' ? deviceData.specifications : JSON.stringify(deviceData.specifications)) 
                : null)
            .input('Quantity', sql.Int, deviceData.quantity || null)
            .input('MinQuantity', sql.Int, deviceData.min_quantity || null)
            .input('Location', sql.NVarChar, deviceData.location || null)
            .input('Shelf', sql.NVarChar, deviceData.shelf || null)
            .input('StockNotes', sql.NVarChar, deviceData.stock_notes || null)
            .input('UpdatedBy', sql.Int, req.user.id)
            .execute('sp_UpdateDevice');
        
        const procResult = result.recordset[0];
        
        res.json({
            success: procResult.Success === 1,
            message: procResult.Message
        });
        
    } catch (error) {
        console.error('Ошибка обновления прибора:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении прибора: ' + error.message
        });
    }
});

app.delete('/api/devices/:id', verifyToken, async (req, res) => {
    try {
        const deviceId = req.params.id;
        
        // Проверяем, есть ли активные заявки с этим прибором
        const activeRequests = await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .query(`
                SELECT COUNT(*) as count
                FROM tbl_ShipmentRequestItems i
                JOIN tbl_ShipmentRequests sr ON i.request_id = sr.id
                WHERE i.device_id = @deviceId 
                  AND sr.status IN ('new', 'processing', 'partial')
            `);
        
        if (activeRequests.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Нельзя архивировать прибор, по которому есть активные заявки'
            });
        }
        
        // Архивируем прибор
        const result = await dbPool.request()
            .input('DeviceId', sql.Int, deviceId)
            .query(`
                UPDATE tbl_Devices 
                SET status = 'archived',
                    is_deleted = 1
                WHERE id = @DeviceId AND is_deleted = 0
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Прибор не найден'
            });
        }
        
        res.json({
            success: true,
            message: 'Прибор архивирован'
        });
        
    } catch (error) {
        console.error('Ошибка архивации прибора:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка архивации прибора: ' + error.message
        });
    }
});

// 17. ПОЛУЧЕНИЕ КАТЕГОРИЙ
app.get('/api/categories', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT DISTINCT category 
                FROM tbl_Devices 
                WHERE status = 'active' AND is_deleted = 0 AND category IS NOT NULL 
                ORDER BY category
            `);
        
        res.json({
            success: true,
            categories: result.recordset.map(item => item.category)
        });
    } catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения категорий'
        });
    }
});

// 18. ПОИСК ПРИБОРОВ
app.get('/api/devices/search', verifyToken, async (req, res) => {
    try {
        const { q = '', limit = 20 } = req.query;
        
        if (!q || q.trim() === '') {
            return res.json({ success: true, devices: [] });
        }
        
        const result = await dbPool.request()
            .input('Query', sql.NVarChar, q)
            .input('Limit', sql.Int, parseInt(limit))
            .execute('sp_SearchDevices');
        
        res.json({
            success: true,
            devices: result.recordset
        });
    } catch (error) {
        console.error('Ошибка поиска:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка поиска'
        });
    }
});

// 19. ПРИБОРЫ ТРЕБУЮЩИЕ ПОПОЛНЕНИЯ
app.get('/api/devices/needing-restock', verifyToken, async (req, res) => {
    try {
        console.log('📡 Запрос приборов для пополнения от:', req.user?.email);
        
        const result = await dbPool.request()
            .query(`
                SELECT 
                    d.id,
                    d.unique_id,
                    d.name,
                    ISNULL(d.category, '') as category,
                    ISNULL(d.manufacturer, '') as manufacturer,
                    ISNULL(d.model, '') as model,
                    ISNULL(s.quantity, 0) as quantity,
                    ISNULL(s.min_quantity, 5) as min_quantity,
                    ISNULL(s.location, '') as location,
                    ISNULL(s.shelf, '') as shelf,
                    CASE 
                        WHEN ISNULL(s.quantity, 0) = 0 THEN ISNULL(s.min_quantity, 5)
                        WHEN ISNULL(s.quantity, 0) < ISNULL(s.min_quantity, 5) THEN ISNULL(s.min_quantity, 5) - ISNULL(s.quantity, 0)
                        ELSE 0
                    END as shortage
                FROM tbl_Devices d
                LEFT JOIN tbl_Stock s ON d.id = s.device_id
                WHERE d.status = 'active'
                    AND ISNULL(s.quantity, 0) <= ISNULL(s.min_quantity, 5)
                ORDER BY 
                    CASE 
                        WHEN ISNULL(s.quantity, 0) = 0 THEN 1
                        ELSE 2
                    END,
                    shortage DESC
            `);
        
        console.log(`📊 Найдено приборов для пополнения: ${result.recordset.length}`);
        
        // Выводим первые 5 для проверки
        if (result.recordset.length > 0) {
            console.log('📋 Примеры:');
            result.recordset.slice(0, 3).forEach(d => {
                console.log(`   - ${d.name}: ${d.quantity}/${d.min_quantity}`);
            });
        }
        
        res.json({
            success: true,
            devices: result.recordset
        });
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/devices/:id/movements', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('deviceId', sql.Int, req.params.id)
            .query(`
                SELECT TOP 50
                    sm.id,
                    sm.movement_date,
                    sm.movement_type,
                    sm.quantity_change,
                    sm.previous_quantity,
                    sm.new_quantity,
                    sm.notes,
                    sm.document_number,
                    sm.performed_by,
                    d.unique_id,
                    d.name,
                    CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as performed_by_name
                FROM tbl_StockMovements sm
                JOIN tbl_Devices d ON sm.device_id = d.id
                LEFT JOIN tbl_Users u ON sm.performed_by = u.id
                WHERE sm.device_id = @deviceId
                    AND sm.movement_type IN ('поступление', 'поступление по заявке', 'отгрузка по заявке')
                ORDER BY sm.movement_date DESC
            `);
        
        console.log('Найдено движений:', result.recordset.length);
        
        res.json({
            success: true,
            movements: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения истории движений:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения истории движений'
        });
    }
});
app.post('/api/replenishment-requests', verifyToken, async (req, res) => {
    try {
        const { deviceId, quantity, reason, notes } = req.body;
        
        if (!deviceId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Укажите прибор и количество'
            });
        }
        
        const result = await dbPool.request()
            .input('DeviceId', sql.Int, deviceId)
            .input('Quantity', sql.Int, quantity)
            .input('Reason', sql.NVarChar, reason || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .input('Notes', sql.NVarChar, notes || null)
            .execute('sp_CreateReplenishmentRequest');
        
        const requestResult = result.recordset[0];
        
        console.log('📝 Результат создания заявки:', requestResult);
        
        if (requestResult.Success === 0) {
            return res.status(400).json({
                success: false,
                message: requestResult.Message
            });
        }
        
        // Уведомление администратору
        if (req.user.role !== 'admin') {
            const adminsResult = await dbPool.request()
                .query(`SELECT id FROM tbl_Users WHERE role = 'admin' AND is_active = 1`);
            
            for (const admin of adminsResult.recordset) {
                await createSystemNotification(
                    admin.id,
                    'new_replenishment_request',
                    '📦 Новая заявка на пополнение',
                    `Сотрудник ${req.user.full_name} создал заявку №${requestResult.RequestNumber} на пополнение.`,
                    `/replenishment-requests/${requestResult.RequestId}`
                );
            }
        }
        
        res.status(201).json({
            success: true,
            requestId: requestResult.RequestId,
            requestNumber: requestResult.RequestNumber,
            message: requestResult.Message
        });
        
    } catch (error) {
        console.error('Ошибка создания заявки на пополнение:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания заявки: ' + error.message
        });
    }
});

// 22. ПОЛУЧЕНИЕ СПИСКА ЗАЯВОК НА ПОПОЛНЕНИЕ
app.get('/api/replenishment-requests', verifyToken, async (req, res) => {
    try {
        const { status, page = 1, pageSize = 50 } = req.query;
        
        // Используем прямое обращение к таблице, а не к представлению
        // чтобы гарантированно получить все поля
        let query = `
            SELECT 
                r.id,
                r.request_number,
                r.device_id,
                d.unique_id as device_unique_id,
                d.name as device_name,
                d.category as device_category,
                r.quantity_requested,
                ISNULL(r.fulfilled_quantity, 0) as fulfilled_quantity,
                ISNULL(r.remaining_quantity, r.quantity_requested - ISNULL(r.fulfilled_quantity, 0)) as remaining_quantity,
                r.reason,
                r.status,
                r.is_hidden_from_employee,
                CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
                r.created_at,
                CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as approved_by_name,
                r.approved_at,
                r.completed_at,
                r.notes,
                r.last_fulfilled_at
            FROM tbl_ReplenishmentRequests r
            JOIN tbl_Devices d ON r.device_id = d.id
            LEFT JOIN tbl_Users u1 ON r.created_by = u1.id
            LEFT JOIN tbl_Users u2 ON r.approved_by = u2.id
            WHERE 1=1
        `;
        
        const request = dbPool.request();
        
        // Для сотрудника - показываем только его заявки (не скрытые)
        if (req.user.role === 'employee') {
            query += ` AND r.created_by = @userId AND (r.is_hidden_from_employee = 0 OR r.is_hidden_from_employee IS NULL)`;
            request.input('userId', sql.Int, req.user.id);
        }
        
        // Фильтр по статусу
        if (status && status !== 'all') {
            query += ` AND r.status = @status`;
            request.input('status', sql.NVarChar, status);
        }
        
        // Сортировка и пагинация
        query += ` ORDER BY 
                    CASE r.status 
                        WHEN 'pending' THEN 1
                        WHEN 'processing' THEN 2
                        WHEN 'completed' THEN 3
                        WHEN 'rejected' THEN 4
                        ELSE 5
                    END,
                    r.created_at DESC
                  OFFSET @offset ROWS
                  FETCH NEXT @pageSize ROWS ONLY`;
        
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));
        
        const result = await request.query(query);
        
        // Получаем общее количество для пагинации
        let countQuery = `
            SELECT COUNT(*) as total
            FROM tbl_ReplenishmentRequests r
            WHERE 1=1
        `;
        
        const countRequest = dbPool.request();
        
        if (req.user.role === 'employee') {
            countQuery += ` AND r.created_by = @userId AND (r.is_hidden_from_employee = 0 OR r.is_hidden_from_employee IS NULL)`;
            countRequest.input('userId', sql.Int, req.user.id);
        }
        
        if (status && status !== 'all') {
            countQuery += ` AND r.status = @status`;
            countRequest.input('status', sql.NVarChar, status);
        }
        
        const countResult = await countRequest.query(countQuery);
        const total = countResult.recordset[0]?.total || 0;
        
        res.json({
            success: true,
            requests: result.recordset,
            total: total,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
        
    } catch (error) {
        console.error('Ошибка получения заявок на пополнение:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок: ' + error.message
        });
    }
});

// 23. ПОЛУЧЕНИЕ ДЕТАЛЕЙ ЗАЯВКИ НА ПОПОЛНЕНИЕ
// 23. ПОЛУЧЕНИЕ ДЕТАЛЕЙ ЗАЯВКИ НА ПОПОЛНЕНИЕ
app.get('/api/replenishment-requests/:id', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT 
                    r.id,
                    r.request_number,
                    r.device_id,
                    d.unique_id as device_unique_id,
                    d.name as device_name,
                    d.category as device_category,
                    r.quantity_requested,
                    ISNULL(r.fulfilled_quantity, 0) as fulfilled_quantity,
                    ISNULL(r.remaining_quantity, r.quantity_requested - ISNULL(r.fulfilled_quantity, 0)) as remaining_quantity,
                    r.reason,
                    r.status,
                    r.is_hidden_from_employee,
                    CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
                    r.created_at,
                    CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as approved_by_name,
                    r.approved_at,
                    r.completed_at,
                    r.notes,
                    r.last_fulfilled_at
                FROM tbl_ReplenishmentRequests r
                JOIN tbl_Devices d ON r.device_id = d.id
                LEFT JOIN tbl_Users u1 ON r.created_by = u1.id
                LEFT JOIN tbl_Users u2 ON r.approved_by = u2.id
                WHERE r.id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        const request = result.recordset[0];
        
        // Проверка прав доступа для сотрудника
        if (req.user.role === 'employee' && request.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        res.json({
            success: true,
            request: request
        });
        
    } catch (error) {
        console.error('Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявки'
        });
    }
});

// 24. ПОДТВЕРЖДЕНИЕ ЗАЯВКИ (АДМИН) С ГЕНЕРАЦИЕЙ ТТН-1
app.post('/api/replenishment-requests/:id/approve', verifyToken, requireAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        const transaction = dbPool.transaction();
        await transaction.begin();
        
        try {
            const requestResult = await transaction.request()
                .input('id', sql.Int, requestId)
                .query(`
                    SELECT rr.*, d.name as device_name, d.model, d.unique_id, d.price
                    FROM tbl_ReplenishmentRequests rr
                    JOIN tbl_Devices d ON rr.device_id = d.id
                    WHERE rr.id = @id AND rr.status = 'pending'
                `);
            
            if (requestResult.recordset.length === 0) {
                throw new Error('Заявка не найдена или уже обработана');
            }
            
            const request = requestResult.recordset[0];
            
            // ✅ ИСПРАВЛЕНО: добавлен параметр @quantity
            await transaction.request()
                .input('id', sql.Int, requestId)
                .input('approved_by', sql.Int, req.user.id)
                .input('quantity', sql.Int, request.quantity_requested)  // ← ДОБАВИТЬ ЭТУ СТРОКУ
                .query(`
                    UPDATE tbl_ReplenishmentRequests 
                    SET status = 'processing', 
                        approved_by = @approved_by, 
                        approved_at = CAST(GETDATE() AS DATE),
                        fulfilled_quantity = @quantity,
                        remaining_quantity = 0,
                        last_fulfilled_at = CAST(GETDATE() AS DATE)
                    WHERE id = @id
                `);
            
            const stockResult = await transaction.request()
                .input('device_id', sql.Int, request.device_id)
                .query('SELECT quantity FROM tbl_Stock WHERE device_id = @device_id');
            
            const currentQty = stockResult.recordset[0]?.quantity || 0;
            const newQty = currentQty + request.quantity_requested;
            
            if (stockResult.recordset.length === 0) {
                await transaction.request()
                    .input('device_id', sql.Int, request.device_id)
                    .input('quantity', sql.Int, request.quantity_requested)
                    .input('min_quantity', sql.Int, 5)
                    .input('last_updated_by', sql.Int, req.user.id)
                    .query(`
                        INSERT INTO tbl_Stock (device_id, quantity, min_quantity, last_updated_by, last_updated)
                        VALUES (@device_id, @quantity, @min_quantity, @last_updated_by, CAST(GETDATE() AS DATE))
                    `);
            } else {
                await transaction.request()
                    .input('device_id', sql.Int, request.device_id)
                    .input('new_quantity', sql.Int, newQty)
                    .input('last_updated_by', sql.Int, req.user.id)
                    .query(`
                        UPDATE tbl_Stock 
                        SET quantity = @new_quantity,
                            last_updated = CAST(GETDATE() AS DATE),
                            last_updated_by = @last_updated_by
                        WHERE device_id = @device_id
                    `);
            }
            
            const ttnNumberResult = await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .query("SELECT dbo.fn_GenerateTTN1Number(@RequestId) as ttn_number");
            const ttnNumber = ttnNumberResult.recordset[0].ttn_number;
            
            await transaction.request()
                .input('device_id', sql.Int, request.device_id)
                .input('movement_type', sql.NVarChar, 'поступление по заявке')
                .input('quantity_change', sql.Int, request.quantity_requested)
                .input('previous_quantity', sql.Int, currentQty)
                .input('new_quantity', sql.Int, newQty)
                .input('performed_by', sql.Int, req.user.id)
                .input('notes', sql.NVarChar, 'Поступление по заявке на пополнение (ТТН-1)')
                .input('request_id', sql.Int, requestId)
                .input('request_type', sql.NVarChar, 'replenishment')
                .input('document_number', sql.NVarChar, ttnNumber)
                .query(`
                    INSERT INTO tbl_StockMovements 
                        (device_id, movement_type, quantity_change, previous_quantity, new_quantity, 
                         performed_by, notes, movement_date, request_id, request_type, document_number)
                    VALUES 
                        (@device_id, @movement_type, @quantity_change, @previous_quantity, @new_quantity,
                         @performed_by, @notes, CAST(GETDATE() AS DATE), @request_id, @request_type, @document_number)
                `);
            
            await transaction.request()
                .input('id', sql.Int, requestId)
                .query(`
                    UPDATE tbl_ReplenishmentRequests 
                    SET status = 'completed', completed_at = CAST(GETDATE() AS DATE)
                    WHERE id = @id
                `);
            
            await transaction.commit();
            
            // Уведомление сотруднику
            if (request.created_by && request.created_by !== req.user.id) {
                const userCheck = await dbPool.request()
                    .input('userId', sql.Int, request.created_by)
                    .query('SELECT role FROM tbl_Users WHERE id = @userId');
                
                if (userCheck.recordset[0]?.role === 'employee') {
                    await createSystemNotification(
                        request.created_by,
                        'replenishment_approved',
                        'Заявка на пополнение выполнена',
                        `Ваша заявка №${requestId} на пополнение прибора "${request.device_name}" выполнена.`,
                        `/replenishment-requests/${requestId}`
                    );
                }
            }
            
            res.json({
                success: true,
                message: 'Заявка подтверждена, товар добавлен на склад.',
                documents: {
                    ttn: ttnNumber
                }
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('Ошибка подтверждения заявки:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка подтверждения заявки'
        });
    }
});



// Функция генерации ТТН-1 для пополнения
async function generateReplenishmentTTN1(requestData) {
    const totalAmount = requestData.items.reduce((sum, item) => sum + item.amount, 0);
    const totalVat = requestData.items.reduce((sum, item) => sum + item.vat, 0);
    const totalWithVat = requestData.items.reduce((sum, item) => sum + item.amount_with_vat, 0);
    const totalWeight = requestData.items.reduce((sum, item) => sum + item.weight, 0);
    const totalItems = requestData.items.reduce((sum, item) => sum + item.quantity, 0);
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>ТТН-1 №${requestData.number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 15mm; line-height: 1.2; }
        h1 { font-size: 16pt; text-align: center; font-weight: bold; margin-bottom: 30px; }
        .parties-wrapper { display: flex; justify-content: center; align-items: center; margin: 30px 0; }
        .parties-table { width: 50%; border-collapse: collapse; }
        .parties-table td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12pt; }
        .parties-table .header { font-weight: bold; background-color: #f0f0f0; font-size: 12pt; }
        .unp-label { font-weight: bold; margin-right: 15px; white-space: nowrap; font-size: 12pt; }
        .field-block { margin-bottom: 15px; }
        .field-name { font-weight: bold; margin-bottom: 3px; font-size: 14pt; }
        .field-line { border-bottom: 1px solid #000; width: 100%; min-height: 17px; margin: 2px 0; font-size: 12pt; }
        .field-hint { font-size: 10pt; color: #555; margin-top: 2px; }
        .two-columns { display: flex; gap: 30px; margin-bottom: 15px; }
        .column { flex: 1; }
        .three-columns { display: flex; gap: 20px; margin-bottom: 15px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .items-table th, .items-table td { border: 1px solid #000; padding: 6px; }
        .items-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; font-size: 12pt; }
        .items-table td { font-size: 12pt; }
        .totals { margin: 20px 0; }
        .signatures { margin-top: 25px; }
        .signature-row { margin: 15px 0; }
        .signature-line { border-bottom: 1px solid #000; display: inline-block; min-width: 200px; margin-left: 10px; }
        .signature-name { font-weight: bold; display: inline-block; min-width: 150px; font-size: 14pt; }
    </style>
</head>
<body>
    <h1>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ  ${requestData.number} от ${requestData.date}</h1>
    
    <div class="parties-wrapper">
        <div style="display: flex; flex-direction: column; align-items: flex-start; margin-right: 15px;">
            <span style="height: 38px;"></span>
            <span class="unp-label">УНП</span>
        </div>
        <table class="parties-table">
            <tr>
                <td class="header">Грузоотправитель</td>
                <td class="header">Грузополучатель</td>
                <td class="header">Заказчик (плательщик)</td>
            </tr>
            <tr>
                <td>${requestData.consignor_unp}</td>
                <td>${requestData.consignee_unp}</td>
                <td>${requestData.consignee_unp}</td>
            </tr>
        </table>
    </div>

    <div class="three-columns">
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name">Автомобиль</span>
                <span class="field-line">${requestData.vehicle}</span>
            </div>
            <div class="field-hint">(марка, регистрационный знак)</div>
        </div>
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name">Прицеп</span>
                <span class="field-line">${requestData.trailer}</span>
            </div>
            <div class="field-hint">(марка, регистрационный знак)</div>
        </div>
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name">К путевому листу №</span>
                <span class="field-line">${requestData.waybill_number}</span>
            </div>
        </div>
    </div>

    <div class="two-columns">
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name">Водитель</span>
                <span class="field-line">${requestData.driver}</span>
            </div>
            <div class="field-hint">(фамилия, инициалы)</div>
        </div>
    </div>
    
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name">Грузоотправитель</span>
            <span class="field-line">${requestData.consignor_name}, ${requestData.consignor_address}</span>
        </div>
    </div>
    
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name">Грузополучатель</span>
            <span class="field-line">${requestData.consignee_name}, ${requestData.consignee_address}</span>
        </div>
    </div>
    
    <h2 style="font-size: 16pt; text-align: center; margin: 15px 0;">I. ТОВАРНЫЙ РАЗДЕЛ</h2>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>Наименование товара</th>
                <th>Ед.</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма без НДС</th>
                <th>НДС%</th>
                <th>Сумма НДС</th>
                <th>Сумма с НДС</th>
                <th>Масса, кг</th>
            </tr>
        </thead>
        <tbody>
            ${requestData.items.map(item => `
            <tr>
                <td>${item.name} ${item.model || ''}</td>
                <td style="text-align: center;">шт</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${item.price.toFixed(2)}</td>
                <td style="text-align: right;">${item.amount.toFixed(2)}</td>
                <td style="text-align: center;">20</td>
                <td style="text-align: right;">${item.vat.toFixed(2)}</td>
                <td style="text-align: right;">${item.amount_with_vat.toFixed(2)}</td>
                <td style="text-align: right;">${item.weight.toFixed(2)}</td>
            </tr>
            `).join('')}
            <tr style="font-weight: bold;">
                <td colspan="4" style="text-align: right;">ИТОГО:</td>
                <td style="text-align: right;">${totalAmount.toFixed(2)}</td>
                <td style="text-align: center;"></td>
                <td style="text-align: right;">${totalVat.toFixed(2)}</td>
                <td style="text-align: right;">${totalWithVat.toFixed(2)}</td>
                <td style="text-align: right;">${totalWeight.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="totals">
        <div>Всего сумма НДС: ${totalVat.toFixed(2)} руб.</div>
        <div>Всего стоимость с НДС: ${totalWithVat.toFixed(2)} руб.</div>
        <div>Всего масса груза: ${totalWeight.toFixed(2)} кг</div>
        <div>Всего количество грузовых мест: ${totalItems}</div>
    </div>
    
    <div class="signatures">
        <div class="signature-row">
            <span class="signature-name">Отпуск разрешил:</span>
            <span class="signature-line">Начальник производства Иванов И.И.</span>
        </div>
        <div class="signature-row">
            <span class="signature-name">Сдал грузоотправитель:</span>
            <span class="signature-line">${requestData.completed_by_user?.position || 'Кладовщик'} ${requestData.completed_by_user?.full_name || req.user.full_name}</span>
        </div>
        <div class="signature-row">
            <span class="signature-name">Товар к перевозке принял:</span>
            <span class="signature-line">Водитель ${requestData.driver}</span>
        </div>
        <div class="signature-row">
            <span class="signature-name">по доверенности:</span>
            <span class="signature-line">${requestData.power_of_attorney}</span>
        </div>
        <div class="signature-row">
            <span class="signature-name">Принял грузополучатель:</span>
            <span class="signature-line">Заведующий склада Сидоров П.А.</span>
        </div>
        <div class="signature-row">
            <span class="signature-name">№ пломбы:</span>
            <span class="signature-line">ПЛ-${String(requestData.number).slice(-6)}</span>
        </div>
    </div>
    
    <div class="field-block" style="margin-top: 20px;">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name">С товаром переданы документы:</span>
            <span class="field-line">Товарно-транспортная накладная ${requestData.number}</span>
        </div>
    </div>
</body>
</html>`;
}

app.post('/api/replenishment-requests/:id/reject', verifyToken, requireAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body;
        
        const requestData = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .query(`
                SELECT rr.request_number, rr.quantity_requested, rr.created_by,
                       d.name as device_name, u.email as user_email,
                       CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as user_fullname
                FROM tbl_ReplenishmentRequests rr
                JOIN tbl_Devices d ON rr.device_id = d.id
                JOIN tbl_Users u ON rr.created_by = u.id
                WHERE rr.id = @RequestId AND rr.status = 'pending'
            `);
        
        if (requestData.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена или уже обработана'
            });
        }
        
        const request = requestData.recordset[0];
        
        // Отклоняем заявку
        const result = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .input('ApprovedBy', sql.Int, req.user.id)
            .execute('sp_RejectReplenishment');
        
        const procResult = result.recordset[0];
        
        if (procResult.Success === 1) {
            // Уведомление ТОЛЬКО если заявку создал НЕ текущий пользователь
            if (procResult.CreatedBy && procResult.CreatedBy !== req.user.id) {
                const userCheck = await dbPool.request()
                    .input('userId', sql.Int, procResult.CreatedBy)
                    .query('SELECT role FROM tbl_Users WHERE id = @userId');
                
                if (userCheck.recordset[0]?.role === 'employee') {
                    await createSystemNotification(
                        procResult.CreatedBy,
                        'replenishment_rejected',
                        `Ваша заявка №${requestId} на пополнение прибора "${request.device_name}" отклонена.}`,
                        null
                    );
                }
            }
            
            res.json({
                success: true,
                message: 'Заявка отклонена, уведомление отправлено'
            });
        } else {
            res.json({
                success: false,
                message: procResult.Message
            });
        }
        
    } catch (error) {
        console.error('Ошибка отклонения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка отклонения заявки: ' + error.message
        });
    }
});

// 26. УДАЛЕНИЕ ЗАЯВКИ НА ПОПОЛНЕНИЕ (АДМИН)
app.delete('/api/replenishment-requests/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        const result = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .execute('sp_DeleteReplenishmentRequest');
        
        const procResult = result.recordset[0];
        
        res.json({
            success: procResult.Success === 1,
            message: procResult.Message
        });
        
    } catch (error) {
        console.error('Ошибка удаления заявки на пополнение:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка удаления заявки'
        });
    }
});

// 27. ПОЛУЧЕНИЕ ДОКУМЕНТОВ ПО ЗАЯВКЕ НА ПОПОЛНЕНИЕ
app.get('/api/replenishment-requests/:id/documents', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        const result = await dbPool.request()
            .input('request_id', sql.Int, requestId)
            .query(`
                SELECT 
                    sm.document_number,
                    sm.movement_date as document_date,
                    sm.notes,
                    CASE 
                        WHEN sm.notes LIKE '%ТН-2%' THEN 'Товарная накладная (ТН-2)'
                        WHEN sm.notes LIKE '%ТТН-1%' THEN 'Товарно-транспортная накладная (ТТН-1)'
                        ELSE 'Документ поступления'
                    END as document_name
                FROM tbl_StockMovements sm
                WHERE sm.request_id = @request_id 
                  AND sm.request_type = 'replenishment'
                  AND sm.document_number IS NOT NULL
                ORDER BY sm.movement_date ASC
            `);
        
        const documents = result.recordset.map((doc, index) => ({
            id: index + 1,
            document_type: doc.notes && doc.notes.includes('ТТН') ? 'waybill_ttn1' : 'invoice_tn2',
            document_type_name: doc.document_name,
            document_number: doc.document_number,
            document_date: doc.document_date,
            reference_id: requestId,
            reference_type: 'replenishment'
        }));
        
        res.json({
            success: true,
            documents: documents
        });
        
    } catch (error) {
        console.error('Ошибка получения документов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения документов'
        });
    }
});

// Эндпоинт экспорта документа пополнения
app.get('/api/replenishment-requests/:id/export-document', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        const format = req.query.format || 'html';
        const documentNumber = req.query.documentNumber || null;
        
        console.log('📄 Экспорт документа пополнения, requestId:', requestId, 'docNumber:', documentNumber);
        
        // Получаем данные заявки
        const requestResult = await dbPool.request()
            .input('id', sql.Int, requestId)
            .query(`
                SELECT 
                    rr.id,
                    rr.request_number,
                    rr.quantity_requested,
                    rr.created_at,
                    rr.completed_at,
                    rr.approved_by,
                    d.id as device_id,
                    d.name as device_name,
                    d.model,
                    d.unique_id,
                    d.price
                FROM tbl_ReplenishmentRequests rr
                JOIN tbl_Devices d ON rr.device_id = d.id
                WHERE rr.id = @id
            `);
        
        if (requestResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        const request = requestResult.recordset[0];
        
        // Если указан конкретный номер документа - ищем именно эту поставку
        let items = [];
        let movementDate = request.completed_at || request.created_at;
        let actualQuantity = request.quantity_requested;
        let ttnNumber = null; // ← ДОБАВЛЯЕМ ПЕРЕМЕННУЮ ДЛЯ НОМЕРА ТТН
        
        if (documentNumber) {
            // Ищем конкретную поставку по номеру документа
            const movementResult = await dbPool.request()
                .input('requestId', sql.Int, requestId)
                .input('documentNumber', sql.NVarChar, documentNumber)
                .query(`
                    SELECT 
                        quantity_change,
                        movement_date,
                        document_number,
                        notes
                    FROM tbl_StockMovements
                    WHERE request_id = @requestId 
                      AND request_type = 'replenishment'
                      AND document_number = @documentNumber
                `);
            
            if (movementResult.recordset.length > 0) {
                const movement = movementResult.recordset[0];
                actualQuantity = Math.abs(movement.quantity_change);
                movementDate = movement.movement_date;
                ttnNumber = movement.document_number; // ← БЕРЕМ НОМЕР ИЗ БД
                console.log(`📦 Найдена поставка на ${actualQuantity} шт., ТТН: ${ttnNumber}`);
            } else {
                console.log(`⚠️ Поставка с номером ${documentNumber} не найдена`);
            }
        } else {
            // Если номер не указан - берем последнюю поставку
            const lastMovement = await dbPool.request()
                .input('requestId', sql.Int, requestId)
                .query(`
                    SELECT TOP 1 
                        quantity_change,
                        movement_date,
                        document_number
                    FROM tbl_StockMovements
                    WHERE request_id = @requestId 
                      AND request_type = 'replenishment'
                      AND document_number IS NOT NULL
                    ORDER BY movement_date DESC
                `);
            
            if (lastMovement.recordset.length > 0) {
                actualQuantity = Math.abs(lastMovement.recordset[0].quantity_change);
                movementDate = lastMovement.recordset[0].movement_date;
                ttnNumber = lastMovement.recordset[0].document_number;
                console.log(`📦 Используем последнюю поставку: ${actualQuantity} шт., ТТН: ${ttnNumber}`);
            }
        }
        
        // Если не нашли ТТН в БД - генерируем на основе заявки
        if (!ttnNumber) {
            const docYear = movementDate ? new Date(movementDate).getFullYear() : new Date().getFullYear();
            const docMonth = movementDate ? String(new Date(movementDate).getMonth() + 1).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
            const docDay = movementDate ? String(new Date(movementDate).getDate()).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
            ttnNumber = `ТТН-${docYear}${docMonth}${docDay}-${String(request.id).slice(-4)}`;
        }
        
        // Формируем позиции с ФАКТИЧЕСКИМ количеством
        items = [{
            name: request.device_name,
            model: request.model || '',
            unique_id: request.unique_id,
            quantity_requested: request.quantity_requested,
            quantity_shipped: actualQuantity, // Фактическое количество
            price_per_unit: request.price || 0
        }];
        
        // Получаем данные о сотруднике
        let completedByUser = null;
        if (request.approved_by) {
            const userResult = await dbPool.request()
                .input('userId', sql.Int, request.approved_by)
                .query('SELECT CONCAT(last_name, \' \', first_name, ISNULL(\' \' + middle_name, \'\')) as full_name FROM tbl_Users WHERE id = @userId');
            
            if (userResult.recordset.length > 0) {
                completedByUser = {
                    full_name: userResult.recordset[0].full_name,
                    position: 'Заведующий склада'
                };
            }
        }
        
        if (!completedByUser) {
            completedByUser = { full_name: 'Система', position: 'Заведующий склада' };
        }
        
        // Формируем данные для документа с ПРАВИЛЬНЫМ номером ТТН
        const shipmentRequest = {
            id: request.id,
            request_number: request.request_number,
            customer_name: 'НПУП «АТОМТЕХ» (Склад)',
            customer_unp: '332279933',
            customer_address: 'г. Минск, ул. Гикало, 5',
            completed_at: movementDate,
            created_at: request.created_at,
            completed_by: request.approved_by,
            contract_number: `ПОП-${new Date(movementDate).getFullYear()}-${String(request.id).padStart(4, '0')}`,
            vehicle_number: 'МАЗ-5440 АА1234-7',
            trailer_number: 'МАЗ-856100 АА5678-7',
            waybill_number_ttn: `ПЛ-${new Date(movementDate).getFullYear()}-${String(request.id).padStart(4, '0')}`,
            driver_name: 'Петров Иван Сидорович',
            power_of_attorney: `Доверенность № ${request.id} от ${new Date(movementDate).toLocaleDateString('ru-RU')}`,
            shipping_date: movementDate,
            ttn_number: ttnNumber  // ← ПЕРЕДАЕМ ПРАВИЛЬНЫЙ НОМЕР ТТН
        };
        
        console.log(`📄 Экспорт ТТН-1 №${ttnNumber} на ${actualQuantity} шт. из ${request.quantity_requested} заказанных`);
        
        // Вызываем функцию экспорта ТТН-1 для пополнения
        await exportTTN1Document(shipmentRequest, items, format, res, req, true);
        
    } catch (error) {
        console.error('❌ Ошибка экспорта документа пополнения:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта документа: ' + error.message
        });
    }
});

// Универсальная функция генерации ТТН-1
function generateTtn1Html(data, type = 'shipment') {
    let totalAmount = 0, totalVat = 0, totalWithVat = 0, totalWeight = 0, totalItems = 0;
    
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            totalAmount += item.amount || 0;
            totalVat += item.vat || 0;
            totalWithVat += item.amount_with_vat || 0;
            totalWeight += item.weight || 0;
            totalItems += item.quantity || 0;
        });
    }
    
    // Функция для преобразования числа в пропись
    function numberToWordsRu(num) {
        if (num === 0 || isNaN(num)) return 'ноль';
        
        const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        
        function getUnits(num, isFemale = false) {
            const arr = isFemale ? unitsFemale : units;
            return arr[num] || '';
        }
        
        function convertHundreds(n, isFemale = false) {
            let result = '';
            const h = Math.floor(n / 100);
            const t = Math.floor((n % 100) / 10);
            const u = n % 10;
            
            if (h > 0) result += hundreds[h] + ' ';
            if (t === 1) {
                result += teens[u] + ' ';
            } else {
                if (t > 1) result += tens[t] + ' ';
                if (u > 0) result += getUnits(u, isFemale) + ' ';
            }
            return result.trim();
        }
        
        function convertNumber(n) {
            let result = '';
            const millions = Math.floor(n / 1000000);
            const thousands = Math.floor((n % 1000000) / 1000);
            const rest = n % 1000;
            
            if (millions > 0) {
                result += convertHundreds(millions) + ' ';
                const lastDigit = millions % 10;
                const lastTwo = millions % 100;
                if (lastTwo >= 11 && lastTwo <= 19) result += 'миллионов ';
                else if (lastDigit === 1) result += 'миллион ';
                else if (lastDigit >= 2 && lastDigit <= 4) result += 'миллиона ';
                else result += 'миллионов ';
            }
            
            if (thousands > 0) {
                result += convertHundreds(thousands, true) + ' ';
                const lastDigit = thousands % 10;
                const lastTwo = thousands % 100;
                if (lastTwo >= 11 && lastTwo <= 19) result += 'тысяч ';
                else if (lastDigit === 1) result += 'тысяча ';
                else if (lastDigit >= 2 && lastDigit <= 4) result += 'тысячи ';
                else result += 'тысяч ';
            }
            
            if (rest > 0) {
                result += convertHundreds(rest);
            }
            return result.trim();
        }
        
        return convertNumber(Math.floor(num));
    }
    
    const userFullName = (data.completed_by_user && data.completed_by_user.full_name) ? data.completed_by_user.full_name : '______________________';
    const userPosition = (data.completed_by_user && data.completed_by_user.position) ? data.completed_by_user.position : '______________________';
    
    // В зависимости от типа документа (shipment - отгрузка, replenishment - пополнение)
    const isReplenishment = type === 'replenishment';
    
    // Значения для полей в зависимости от типа
    const consignorName = isReplenishment ? 'НПУП «АТОМТЕХ» (Производство)' : (data.consignor_name || 'НПУП «АТОМТЕХ»');
    const consignorAddress = isReplenishment ? 'г. Минск, ул. Производственная, 10' : (data.consignor_address || 'г. Минск, ул. Гикало, 5');
    const consignorUnp = isReplenishment ? '332279933' : (data.consignor_unp || '332279933');
    
    const consigneeName = isReplenishment ? 'НПУП «АТОМТЕХ» (Склад)' : (data.consignee_name || '');
    const consigneeAddress = isReplenishment ? 'г. Минск, ул. Гикало, 5' : (data.consignee_address || '');
    const consigneeUnp = isReplenishment ? '123456789' : (data.consignee_unp || '');
    
    const vehicle = isReplenishment ? 'МАЗ-5440 АА1234-7' : (data.vehicle || '______________');
    const trailer = isReplenishment ? 'МАЗ-856100 АА5678-7' : (data.trailer || '');
    const waybillNumber = isReplenishment ? (data.waybill_number || `ПЛ-${new Date().getFullYear()}-${String(data.number).slice(-4)}`) : (data.waybill_number || '');
    const driver = isReplenishment ? 'Петров Иван Сидорович' : (data.driver || '______________');
    const powerOfAttorney = isReplenishment ? (data.power_of_attorney || `Доверенность № ${data.number} от ${data.date}`) : (data.power_of_attorney || '');
    
    let itemsHtml = '';
    data.items.forEach((item, index) => {
        itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(item.name)} ${escapeHtml(item.model || '')}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">шт</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.price.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.amount.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">20</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.vat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.amount_with_vat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.quantity}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.weight.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px;">&nbsp;</td>
            </tr>
        `;
    });
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>ТТН-1 №${escapeHtml(data.number)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 15mm; line-height: 1.2; }
        h1 { font-size: 16pt; text-align: center; font-weight: bold; margin-bottom: 30px; }
        .parties-wrapper { display: flex; justify-content: center; align-items: center; margin: 30px 0; }
        .parties-table { width: 50%; border-collapse: collapse; }
        .parties-table td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12pt; }
        .parties-table .header { font-weight: bold; background-color: #f0f0f0; font-size: 12pt; }
        .unp-label { font-weight: bold; margin-right: 15px; white-space: nowrap; font-size: 12pt; }
        .field-block { margin-bottom: 15px; }
        .field-name { font-weight: bold; margin-bottom: 3px; font-size: 14pt; }
        .field-line { border-bottom: 1px solid #000; width: 100%; min-height: 17px; margin: 2px 0; font-size: 12pt; }
        .field-hint { font-size: 10pt; color: #555; margin-top: 2px; }
        .two-columns { display: flex; gap: 30px; margin-bottom: 15px; }
        .column { flex: 1; }
        .three-columns { display: flex; gap: 20px; margin-bottom: 15px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
        .items-table th, .items-table td { border: 1px solid #000; padding: 4px; }
        .items-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; font-size: 12pt; }
        .items-table td { font-size: 12pt; }
        .totals { margin: 10px 0; font-weight: bold; font-size: 14pt; }
        .signatures { margin-top: 25px; }
        .signature-row { margin: 15px 0; }
        .signature-left { display: inline-block; width: 48%; }
        .signature-right { display: inline-block; width: 48%; }
        .signature-line { border-bottom: 1px solid #000; display: inline-block; min-width: 200px; margin-left: 10px; }
        .signature-name { font-weight: bold; display: inline-block; min-width: 150px; font-size: 14pt; }
        hr { margin: 10px 0; border: none; border-top: 1px solid #000; }
    </style>
</head>
<body>
    <h1>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ  ${escapeHtml(data.number)} от ${escapeHtml(data.date)}</h1>
    
    <div class="parties-wrapper">
        <div style="display: flex; flex-direction: column; align-items: flex-start; margin-right: 15px;">
            <span style="height: 38px;"></span>
            <span class="unp-label">УНП</span>
        </div>
        <table class="parties-table">
            <tr>
                <td class="header" style="width: 33%;">Грузоотправитель</td>
                <td class="header" style="width: 33%;">Грузополучатель</td>
                <td class="header" style="width: 34%;">Заказчик автомобильной перевозки (плательщик)</td>
            </tr>
            <tr>
                <td>${escapeHtml(consignorUnp)}</td>
                <td>${escapeHtml(consigneeUnp)}</td>
                <td>${escapeHtml(consigneeUnp)}</td>
            </tr>
        </table>
    </div>

    <div style="width: 40%; margin: 10px 0 20px 0;">
        <div style="font-size: 14pt; font-weight: bold;">${escapeHtml(data.date)}</div>
    </div>
    
    <div class="three-columns">
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Автомобиль</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(vehicle)}</span>
            </div>
            <div class="field-hint" style="margin-left: 110px;">(марка, регистрационный знак)</div>
        </div>
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Прицеп</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(trailer)}</span>
            </div>
            <div class="field-hint" style="margin-left: 75px;">(марка, регистрационный знак)</div>
        </div>
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">К путевому листу №</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(waybillNumber)}</span>
            </div>
        </div>
    </div>

    <div class="two-columns">
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Водитель</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(driver)}</span>
            </div>
            <div class="field-hint" style="margin-left: 90px;">(наименование)</div>
            <div class="field-hint" style="margin-left: 250px; margin-top: -15px;">(фамилия и инициалы)</div>
        </div>
    </div>
    
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Заказчик автомобильной перевозки (плательщик)</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(consigneeName)}, ${escapeHtml(consigneeAddress)}</span>
        </div>
        <div class="field-hint" style="margin-left: 440px;">(наименование, адрес)</div>
    </div>
    
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Грузоотправитель</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(consignorName)}, ${escapeHtml(consignorAddress)}</span>
        </div>
        <div class="field-hint" style="margin-left: 165px;">(наименование, адрес)</div>
    </div>
    
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Грузополучатель</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(consigneeName)}, ${escapeHtml(consigneeAddress)}</span>
        </div>
        <div class="field-hint" style="margin-left: 155px;">(наименование, адрес)</div>
    </div>
    
    <div class="three-columns" style="display: flex; gap: 15px;">
        <div class="column" style="flex: 2;">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Основание отпуска</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">Договор поставки № ${escapeHtml(data.contract_number || '')} от ${escapeHtml(data.date || '')}</span>
            </div>
            <div class="field-hint" style="margin-left: 170px;">(дата и номер договора)</div>
        </div>
        <div class="column" style="flex: 1;">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Пункт погрузки</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(consignorAddress)}</span>
            </div>
            <div class="field-hint" style="margin-left: 145px;">(адрес)</div>
        </div>
        <div class="column" style="flex: 1;">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Пункт разгрузки</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeHtml(data.destination || consigneeAddress)}</span>
            </div>
            <div class="field-hint" style="margin-left: 150px;">(адрес)</div>
        </div>
    </div>
    
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Переадресовка</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;"></span>
        </div>
        <div class="field-hint" style="margin-left: 130px;">(наименование, адрес нового получателя, фамилия, инициалы, подпись уполномоченного должностного лица)</div>
    </div>
    
    <h2 style="font-size: 16pt; text-align: center; margin: 15px 0 10px 0; font-weight: bold;">I. ТОВАРНЫЙ РАЗДЕЛ</h2>
    
    <table class="items-table" style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Наименование товара</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Единица измерения</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Количество</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Цена, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Стоимость, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Ставка НДС, %</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Сумма НДС, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Стоимость с НДС, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Количество грузовых мест</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Масса груза, кг</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Примечание</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">1</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">2</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">3</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">4</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">5</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">6</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">7</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">8</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">9</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">10</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">11</th>
             <tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <tr style="font-weight: bold;">
                <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalItems}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalAmount.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalVat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalWithVat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalItems}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalWeight.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px;">&nbsp;</td>
            </tr>
        </tbody>
    </table>
    
    <div class="totals" style="margin: 20px 0;">
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего сумма НДС</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalVat.toFixed(2)} руб. (${numberToWordsRu(Math.floor(totalVat))} рублей ${Math.round((totalVat % 1) * 100)} копеек)
            </div>
        </div>
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего стоимость с НДС</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalWithVat.toFixed(2)} руб. (${numberToWordsRu(Math.floor(totalWithVat))} рублей ${Math.round((totalWithVat % 1) * 100)} копеек)
            </div>
        </div>
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего масса груза</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalWeight.toFixed(2)} кг (${numberToWordsRu(Math.floor(totalWeight))} килограмм)
            </div>
        </div>
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего количество грузовых мест</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalItems} (${numberToWordsRu(totalItems)} мест)
            </div>
        </div>
    </div>
    
    <div class="signatures" style="margin-top: 25px;">
        
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Отпуск разрешил</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${isReplenishment ? 'Начальник производства Иванов И.И.' : 'Менеджер Иванов И.И.'}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись)</div>
        </div>
        
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Сдал грузоотправитель</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${escapeHtml(userPosition)} ${escapeHtml(userFullName)}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись грузоотправителя)</div>
        </div>
        
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Товар к перевозке принял</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Водитель ${escapeHtml(driver)}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись)</div>
        </div>
        
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">по доверенности</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${escapeHtml(powerOfAttorney)}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(номер, дата)</div>
        </div>
        
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Принял грузополучатель</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Заведующий склада Сидоров П.А.</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись грузополучателя)</div>
        </div>
        
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">№ пломбы</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${isReplenishment ? `ПЛ-${String(data.number).slice(-6)}` : '______________'}</div>
            </div>
        </div>
        
    </div>

    <div class="field-block" style="margin: 20px 0;">
        <div style="display: flex; align-items: baseline;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">С товаром переданы документы</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Товарно-транспортная накладная  ${escapeHtml(data.number)}</div>
        </div>
    </div>

</body>
</html>`;
}

async function exportTN2Document(request, items, format, res, req) {
    let completedByUser = null;
    
    // Пытаемся получить данные сотрудника из БД по completed_by
    if (request.completed_by) {
        try {
            const userResult = await dbPool.request()
                .input('userId', sql.Int, request.completed_by)
                .query('SELECT CONCAT(last_name, \' \', first_name, ISNULL(\' \' + middle_name, \'\')) as full_name FROM tbl_Users WHERE id = @userId');
            
            if (userResult.recordset.length > 0) {
                completedByUser = {
                    full_name: userResult.recordset[0].full_name,
                    position: req.user?.role === 'admin' ? 'Заведующий склада' : 
                             req.user?.role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик'
                };
            }
        } catch (err) {
            console.error('Ошибка получения данных пользователя:', err);
        }
    }
    
    // Если нет completed_by, используем текущего пользователя из запроса
    if (!completedByUser && req && req.user) {
        completedByUser = {
            full_name: req.user.full_name,
            position: req.user.role === 'admin' ? 'Заведующий склада' : 
                     req.user.role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик'
        };
    }
    
    // Если всё ещё нет, устанавливаем значения по умолчанию
    if (!completedByUser) {
        completedByUser = {
            full_name: 'Иванов Иван Иванович',
            position: 'Заведующий склада'
        };
    }
    
    let formattedDate = '';
    let docDateForCalc = null;
    
    if (request.completed_at) {
        docDateForCalc = new Date(request.completed_at);
        const d = docDateForCalc;
        formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    } else if (request.created_at) {
        docDateForCalc = new Date(request.created_at);
        const d = docDateForCalc;
        formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    } else {
        const d = new Date();
        formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    }
    
    const docYear = docDateForCalc ? docDateForCalc.getFullYear() : new Date().getFullYear();
    const docMonth = docDateForCalc ? String(docDateForCalc.getMonth() + 1).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    const docDay = docDateForCalc ? String(docDateForCalc.getDate()).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
    const documentNumber = request.waybill_number || `ТН-${docYear}${docMonth}${docDay}-${String(request.id).slice(-4)}`;
    
    // Подсчет итогов
    let totalAmount = 0, totalVat = 0, totalWithVat = 0;
    items.forEach(item => {
        const quantity = item.quantity_shipped || item.quantity_requested;
        const price = item.price_per_unit;
        totalAmount += quantity * price;
        totalVat += quantity * price * 0.2;
        totalWithVat += quantity * price * 1.2;
    });
    
    // ВЫЧИСЛЯЕМ ФИНАЛЬНЫЕ ЗНАЧЕНИЯ ДЛЯ ЭКСПОРТА
    const finalTotalAmount = totalAmount;
    const finalTotalVat = totalVat;
    const finalTotalWithVat = totalWithVat;
    
    const safeFileName = `TN2_${documentNumber}`.replace(/[^a-zA-Z0-9\-]/g, '_');
    
    if (format === 'excel') {
        const excelBuffer = await exportTN2ToExcel(request, items, formattedDate, documentNumber, finalTotalAmount, finalTotalVat, finalTotalWithVat, completedByUser);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
        res.send(excelBuffer);
        
    } else if (format === 'docx') {
        const docxBuffer = await exportTN2ToDocx(request, items, formattedDate, documentNumber, finalTotalAmount, finalTotalVat, finalTotalWithVat, completedByUser);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
        res.send(docxBuffer);
        
    } else if (format === 'html') {
        const documentData = {
            number: documentNumber,
            date: formattedDate,
            seller_name: 'НПУП «АТОМТЕХ»',
            seller_address: 'г. Минск, ул. Гикало, 5',
            seller_unp: '332279933',
            buyer_name: request.customer_name || '',
            buyer_address: request.customer_address || '',
            buyer_unp: request.customer_unp || '',
            contract_number: request.contract_number || 'б/н',
            items: items.map(item => ({
                name: item.name,
                model: item.model || '',
                quantity: item.quantity_shipped || item.quantity_requested,
                price: item.price_per_unit,
                amount: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit,
                vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 0.2,
                amount_with_vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 1.2
            }))
        };
        
        const html = generateHtmlContent({ document_type: 'invoice_tn2' }, documentData, completedByUser);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
        res.send(html);
    }
}

// HTML для ТН-2
function generateTN2Html(request, items, formattedDate, completedByUser) {
    let totalAmount = 0, totalVat = 0, totalWithVat = 0;
    items.forEach(item => {
        const quantity = item.quantity_shipped || item.quantity_requested;
        const price = item.price_per_unit;
        totalAmount += quantity * price;
        totalVat += quantity * price * 0.2;
        totalWithVat += quantity * price * 1.2;
    });
    
    let itemsHtml = '';
    items.forEach((item, index) => {
        const quantity = item.quantity_shipped || item.quantity_requested;
        const price = item.price_per_unit;
        const amount = quantity * price;
        
        itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(item.name)}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(item.model || '-')}</noscript>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${quantity}</noscript>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${price.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${amount.toFixed(2)}</noscript>
            </tr>
        `;
    });
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Товарная накладная ${request.waybill_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 20mm; line-height: 1.3; }
        h1 { font-size: 18pt; text-align: center; font-weight: bold; margin-bottom: 10px; }
        .subtitle { text-align: center; margin-bottom: 30px; font-size: 14pt; }
        .info-block { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
        .info-row { margin: 5px 0; }
        .info-label { font-weight: bold; display: inline-block; width: 150px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #2563eb; color: white; padding: 10px; border: 1px solid #1d4ed8; text-align: center; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .total-row { font-weight: bold; background-color: #e8f5e9; }
        .footer { margin-top: 30px; text-align: center; font-size: 10pt; color: #666; }
        .signature { margin-top: 40px; display: flex; justify-content: space-between; }
    </style>
</head>
<body>
    <h1>ТОВАРНАЯ НАКЛАДНАЯ</h1>
    <div class="subtitle">№ ${escapeHtml(request.waybill_number)} от ${formattedDate}</div>
    
    <div class="info-block">
        <div class="info-row"><span class="info-label">Грузоотправитель:</span> НПУП «АТОМТЕХ»</div>
        <div class="info-row"><span class="info-label">УНП:</span> 332279933</div>
        <div class="info-row"><span class="info-label">Адрес:</span> 220012, г. Минск, ул. Гикало, д. 5</div>
        <div class="info-row"><span class="info-label">Грузополучатель:</span> ${escapeHtml(request.customer_name || '')}</div>
        <div class="info-row"><span class="info-label">УНП:</span> ${escapeHtml(request.customer_unp || '')}</div>
        <div class="info-row"><span class="info-label">Адрес:</span> ${escapeHtml(request.customer_address || '')}</div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>№</th>
                <th>Наименование товара</th>
                <th>Модель</th>
                <th>Количество</th>
                <th>Цена (руб.)</th>
                <th>Сумма (руб.)</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <tr class="total-row">
                <td colspan="5" style="text-align: right;">ИТОГО:</noscript>
                <td style="text-align: right;">${totalAmount.toFixed(2)}</noscript>
            </tr>
        </tbody>
    </table>
    
    <div class="signature">
        <div>Отпуск разрешил: _____________________</div>
        <div>Сдал грузоотправитель: ${completedByUser ? completedByUser.position + ' ' + completedByUser.full_name : '_____________________'}</div>
    </div>
    <div class="signature">
        <div>Товар принял: _____________________</div>
        <div>М.П.</div>
    </div>
    
    <div class="footer">
        <p>© 2026 НПУП «АТОМТЕХ». Документ сформирован автоматически.</p>
    </div>
</body>
</html>`;
}

async function exportTTN1Document(request, items, format, res, req, isReplenishment = false) {
    // Получаем данные сотрудника, завершившего отгрузку
    let completedByUser = null;
    if (request.completed_by) {
        const userResult = await dbPool.request()
            .input('userId', sql.Int, request.completed_by)
            .query('SELECT CONCAT(last_name, \' \', first_name, ISNULL(\' \' + middle_name, \'\')) as full_name FROM tbl_Users WHERE id = @userId');
        
        if (userResult.recordset.length > 0) {
            completedByUser = {
                full_name: userResult.recordset[0].full_name,
                position: req.user?.role === 'admin' ? 'Заведующий склада' : 
                         req.user?.role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик'
            };
        }
    }
    
    // Если нет completed_by, пробуем получить текущего пользователя из запроса
    if (!completedByUser && req && req.user) {
        completedByUser = {
            full_name: req.user.full_name,
            position: req.user.role === 'admin' ? 'Заведующий склада' : 
                     req.user.role === 'manager' ? 'Менеджер по продажам' : 'Кладовщик'
        };
    }
    
    // Если всё ещё нет, устанавливаем значения по умолчанию
    if (!completedByUser) {
        completedByUser = {
            full_name: 'Иванов Иван Иванович',
            position: 'Заведующий склада'
        };
    }
    
    let formattedDate = '';
    let formattedTime = '';
    let docDateForCalc = null;
    
    if (request.completed_at) {
        docDateForCalc = new Date(request.completed_at);
        const d = docDateForCalc;
        formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        formattedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else if (request.created_at) {
        docDateForCalc = new Date(request.created_at);
        const d = docDateForCalc;
        formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        formattedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
        const d = new Date();
        formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        formattedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    
    const docYear = docDateForCalc ? docDateForCalc.getFullYear() : new Date().getFullYear();
    const docMonth = docDateForCalc ? String(docDateForCalc.getMonth() + 1).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    const docDay = docDateForCalc ? String(docDateForCalc.getDate()).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
    const documentNumber = request.ttn_number || `ТТН-${docYear}${docMonth}${docDay}-${String(request.id).slice(-4)}`;
    
    // Разбираем автомобиль
    let vehicleMake = '', vehicleNumber = '';
    const vehicleFull = request.vehicle_number || '';
    const vehicleMatch = vehicleFull.match(/^([A-Za-zА-Яа-я0-9\-]+)\s+([A-Za-z0-9\-]+)$/);
    if (vehicleMatch) {
        vehicleMake = vehicleMatch[1];
        vehicleNumber = vehicleMatch[2];
    } else {
        vehicleMake = vehicleFull;
    }
    
    // Разбираем прицеп
    let trailerMake = '', trailerNumber = '';
    const trailerFull = request.trailer_number || '';
    const trailerMatch = trailerFull.match(/^([A-Za-zА-Яа-я0-9\-]+)\s+([A-Za-z0-9\-]+)$/);
    if (trailerMatch) {
        trailerMake = trailerMatch[1];
        trailerNumber = trailerMatch[2];
    } else {
        trailerMake = trailerFull;
    }
    
    // Подсчет итогов - используем ФАКТИЧЕСКОЕ количество из items
    let totalAmount = 0, totalVat = 0, totalWithVat = 0, totalWeight = 0, totalItems = 0;
    items.forEach(item => {
        // Для пополнения используем quantity_shipped (фактическое)
        // Для отгрузки используем quantity_shipped (отгруженное)
        const quantity = item.quantity_shipped || item.quantity_requested;
        const price = item.price_per_unit;
        totalAmount += quantity * price;
        totalVat += quantity * price * 0.2;
        totalWithVat += quantity * price * 1.2;
        totalWeight += quantity * 2;
        totalItems += quantity;
    });
    
    console.log(`📊 Экспорт ТТН-1: количество в документе = ${totalItems} шт., тип: ${isReplenishment ? 'пополнение' : 'отгрузка'}`);
    
    const safeFileName = `TTN1_${documentNumber}`.replace(/[^a-zA-Z0-9\-]/g, '_');
    
    if (format === 'html') {
        // Формируем даты для погрузки/разгрузки
        let pastDateTime = '';
        let currentDateTime = '';
        
        if (docDateForCalc) {
            const pastDate = new Date(docDateForCalc);
            pastDate.setHours(pastDate.getHours() - 1);
            pastDateTime = `${String(pastDate.getDate()).padStart(2, '0')}.${String(pastDate.getMonth() + 1).padStart(2, '0')}.${pastDate.getFullYear()} ${String(pastDate.getHours()).padStart(2, '0')}:${String(pastDate.getMinutes()).padStart(2, '0')}`;
            currentDateTime = `${formattedDate} ${formattedTime}`;
        } else {
            const now = new Date();
            const pastDate = new Date(now);
            pastDate.setHours(pastDate.getHours() - 1);
            pastDateTime = `${String(pastDate.getDate()).padStart(2, '0')}.${String(pastDate.getMonth() + 1).padStart(2, '0')}.${pastDate.getFullYear()} ${String(pastDate.getHours()).padStart(2, '0')}:${String(pastDate.getMinutes()).padStart(2, '0')}`;
            currentDateTime = `${formattedDate} ${formattedTime}`;
        }
        
        const documentData = {
            number: documentNumber,
            date: formattedDate,
            contract_number: request.contract_number || '',
            consignor_name: 'НПУП «АТОМТЕХ»',
            consignor_address: 'г. Минск, ул. Гикало, 5',
            consignor_unp: '332279933',
            consignee_name: request.customer_name || (isReplenishment ? 'НПУП «АТОМТЕХ» (Склад)' : ''),
            consignee_address: request.customer_address || (isReplenishment ? 'г. Минск, ул. Гикало, 5' : ''),
            consignee_unp: request.customer_unp || (isReplenishment ? '332279933' : ''),
            vehicle: vehicleFull,
            trailer: trailerFull,
            waybill_number: request.waybill_number_ttn || '',
            driver: request.driver_name || '',
            power_of_attorney: request.power_of_attorney || '',
            destination: request.customer_address || '',
            completed_by_user: completedByUser,
            shipping_date: request.shipping_date || request.completed_at || request.created_at,
            request_type: isReplenishment ? 'replenishment' : 'shipment',
            pastDateTime: pastDateTime,
            currentDateTime: currentDateTime,
            items: items.map(item => ({
                name: item.name,
                model: item.model || '',
                unique_id: item.unique_id,
                quantity: item.quantity_shipped || item.quantity_requested, // ФАКТИЧЕСКОЕ количество
                price: item.price_per_unit,
                amount: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit,
                vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 0.2,
                amount_with_vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 1.2,
                weight: (item.quantity_shipped || item.quantity_requested) * 2
            }))
        };
        
        const html = generateTtn1HtmlContent(documentData);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
        res.send(html);
        
    } else if (format === 'excel') {
        const excelBuffer = await exportTTN1ToExcel(request, items, formattedDate, formattedTime, documentNumber, totalAmount, totalVat, totalWithVat, totalWeight, totalItems, completedByUser, docDateForCalc, isReplenishment);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
        res.send(excelBuffer);
        
    } else if (format === 'docx') {
        const docxBuffer = await exportTTN1ToDocx(request, items, formattedDate, formattedTime, documentNumber, totalAmount, totalVat, totalWithVat, totalWeight, totalItems, completedByUser, docDateForCalc, isReplenishment);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
        res.send(docxBuffer);
    }
}

app.post('/api/shipment-requests', verifyToken, requireManager, async (req, res) => {
    try {
        const { 
            customer_name, 
            customer_unp,
            customer_address,
            customer_contact,
            customer_phone,
            customer_director,
            required_date, 
            notes, 
            need_vehicle, 
            vehicle_number,
            trailer_number,
            waybill_number_ttn,
            driver_last_name,
            driver_first_name,
            driver_middle_name,
            driver_license, 
            shipping_date,
            power_of_attorney,
            buyer_legal_address,
            buyer_bank_account,
            buyer_bank_name,
            buyer_bank_code,
            items 
        } = req.body;
        
        console.log('📦 СОЗДАНИЕ ЗАЯВКИ, получены данные:', {
            customer_name,
            customer_phone,
            customer_director,
            need_vehicle,
            vehicle_number,
            driver_last_name,
            driver_first_name
        });
        
        // Валидация
        if (!customer_name) {
            return res.status(400).json({
                success: false,
                message: 'Укажите название организации'
            });
        }
        
        if (!customer_unp) {
            return res.status(400).json({
                success: false,
                message: 'Укажите УНП организации'
            });
        }
        
        if (!customer_address) {
            return res.status(400).json({
                success: false,
                message: 'Укажите адрес организации'
            });
        }
        
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Добавьте хотя бы одну позицию'
            });
        }
        
        // Вызываем хранимую процедуру с обновленными параметрами
        const result = await dbPool.request()
            .input('CustomerName', sql.NVarChar, customer_name)
            .input('CustomerContact', sql.NVarChar, customer_contact || null)
            .input('CustomerAddress', sql.NVarChar, customer_address || null)
            .input('CustomerUnp', sql.NVarChar, customer_unp || null)
            .input('CustomerPhone', sql.NVarChar, customer_phone || null)
            .input('CustomerDirector', sql.NVarChar, customer_director || null)
            .input('RequiredDate', sql.Date, required_date || null)
            .input('Notes', sql.NVarChar, notes || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .input('NeedVehicle', sql.Bit, need_vehicle || false)
            .input('VehicleNumber', sql.NVarChar, vehicle_number || null)
            .input('TrailerNumber', sql.NVarChar, trailer_number || null)
            .input('WaybillNumberTTN', sql.NVarChar, waybill_number_ttn || null)
            .input('DriverLastName', sql.NVarChar, driver_last_name || null)
            .input('DriverFirstName', sql.NVarChar, driver_first_name || null)
            .input('DriverMiddleName', sql.NVarChar, driver_middle_name || null)
            .input('DriverLicense', sql.NVarChar, driver_license || null)
            .input('ShippingDate', sql.Date, shipping_date || null)
            .input('PowerOfAttorney', sql.NVarChar, power_of_attorney || null)
            .input('BuyerLegalAddress', sql.NVarChar, buyer_legal_address || customer_address || null)
            .input('BuyerBankAccount', sql.NVarChar, buyer_bank_account || null)
            .input('BuyerBankName', sql.NVarChar, buyer_bank_name || null)
            .input('BuyerBankCode', sql.NVarChar, buyer_bank_code || null)
            .input('Items', sql.NVarChar, JSON.stringify(items))
            .execute('sp_CreateShipmentRequest');
        
        const procResult = result.recordset[0];
        
        if (!procResult || procResult.Success === 0) {
            return res.status(400).json({
                success: false,
                message: procResult?.Message || 'Ошибка создания заявки'
            });
        }
        
        res.status(201).json({
            success: true,
            requestId: procResult.RequestId,
            requestNumber: procResult.RequestNumber,
            contractNumber: procResult.ContractNumber,
            message: need_vehicle ? 
                'Заявка создана. Сформирован договор.' : 
                'Заявка создана. Сформирован договор.'
        });
        
    } catch (error) {
        console.error('❌ Ошибка создания заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания заявки: ' + error.message
        });
    }
});
app.post('/api/shipment-requests/:id/assign', verifyToken, requireAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { assignedTo } = req.body;
        
        if (!assignedTo) {
            return res.status(400).json({
                success: false,
                message: 'Укажите сотрудника для назначения'
            });
        }
        
        // Назначаем сотрудника
        const result = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .input('AssignedTo', sql.Int, assignedTo)
            .input('AssignedBy', sql.Int, req.user.id)
            .execute('sp_AssignShipmentRequest');
        
        const procResult = result.recordset[0];
        
        if (procResult.Success === 0) {
            return res.status(400).json({
                success: false,
                message: procResult.Message
            });
        }
        
        // Отправляем уведомление сотруднику
        await createSystemNotification(
            assignedTo,
            'shipment_assigned',
            'Вам назначена заявка на отгрузку',
            `Вам назначена заявка №${procResult.RequestNumber} для клиента "${procResult.CustomerName}".`,
            `/shipment-requests/${requestId}`
        );
        
        res.json({
            success: true,
            message: 'Сотрудник назначен на заявку, уведомление отправлено'
        });
        
    } catch (error) {
        console.error('Ошибка назначения сотрудника:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка назначения сотрудника: ' + error.message
        });
    }
});

app.get('/api/users/employees', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT 
                    u.id, 
                    u.email,
                    u.last_name,
                    u.first_name,
                    u.middle_name,
                    CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as full_name,
                    u.phone,
                    COUNT(sr.id) as active_requests_count
                FROM tbl_Users u
                LEFT JOIN tbl_ShipmentRequests sr ON u.id = sr.assigned_to 
                    AND sr.status IN ('new', 'processing', 'partial')
                WHERE u.role = 'employee' AND u.is_active = 1 AND u.is_deleted = 0
                GROUP BY u.id, u.email, u.last_name, u.first_name, u.middle_name, u.phone
                ORDER BY u.last_name, u.first_name
            `);
        
        res.json({ success: true, employees: result.recordset });
    } catch (error) {
        console.error('Ошибка получения сотрудников:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения сотрудников' });
    }
});

app.get('/api/shipment-requests', verifyToken, async (req, res) => {
    try {
        const { status, page = 1, pageSize = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        
        let query = `
            SELECT 
                s.id,
                s.request_number,
                s.customer_name,
                s.customer_contact,
                s.customer_address,
                s.customer_unp,
                s.customer_phone,
                s.customer_director,
                s.required_date,
                s.status,
                s.contract_number,
                s.need_vehicle,
                s.vehicle_number,
                s.trailer_number,
                s.waybill_number_ttn,
                CONCAT(s.driver_last_name, ' ', s.driver_first_name, ISNULL(' ' + s.driver_middle_name, '')) as driver_name,
                s.driver_license,
                s.shipping_date,
                s.waybill_number,
                s.ttn_number,
                s.power_of_attorney,
                s.notes,
                s.created_at,
                s.processed_at,
                s.completed_at,
                c.buyer_legal_address,
                c.buyer_bank_account,
                c.buyer_bank_name,
                c.buyer_bank_code,
                CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
                CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as processed_by_name,
                CONCAT(u3.last_name, ' ', u3.first_name, ISNULL(' ' + u3.middle_name, '')) as completed_by_name,
                CONCAT(u4.last_name, ' ', u4.first_name, ISNULL(' ' + u4.middle_name, '')) as assigned_to_name,
                s.assigned_to,
                COUNT(i.id) as items_count,
                ISNULL(SUM(i.quantity_requested), 0) as total_quantity,
                ISNULL(SUM(i.quantity_shipped), 0) as shipped_quantity,
                ISNULL(SUM(i.quantity_requested * i.price_per_unit), 0) as total_amount,
                ISNULL(SUM(i.quantity_shipped * i.price_per_unit), 0) as shipped_amount,
                COUNT(*) OVER() as total_count
            FROM tbl_ShipmentRequests s
            LEFT JOIN tbl_Contracts c ON s.id = c.request_id
            LEFT JOIN tbl_Users u1 ON s.created_by = u1.id
            LEFT JOIN tbl_Users u2 ON s.processed_by = u2.id
            LEFT JOIN tbl_Users u3 ON s.completed_by = u3.id
            LEFT JOIN tbl_Users u4 ON s.assigned_to = u4.id
            LEFT JOIN tbl_ShipmentRequestItems i ON s.id = i.request_id
            WHERE 1=1
        `;
        
        // Логика видимости заявок
        if (req.user.role === 'admin') {
            // Админ видит ВСЕ заявки
        } 
        else if (req.user.role === 'manager') {
            query += ` AND s.created_by = @userId`;
        } 
        else if (req.user.role === 'employee') {
            query += ` AND s.assigned_to = @userId AND s.status NOT IN ('shipped', 'completed')`;
        }
        
        if (status) {
            query += ` AND s.status = @status`;
        }
        
        query += ` GROUP BY 
            s.id, s.request_number, s.customer_name, s.customer_contact, s.customer_address,
            s.customer_unp, s.customer_phone, s.customer_director, s.required_date, s.status, 
            s.contract_number, s.need_vehicle, s.vehicle_number, s.trailer_number, s.waybill_number_ttn,
            s.driver_last_name, s.driver_first_name, s.driver_middle_name, s.driver_license,
            s.shipping_date, s.waybill_number, s.ttn_number, s.power_of_attorney, s.notes,
            s.created_at, s.processed_at, s.completed_at, c.buyer_legal_address, c.buyer_bank_account,
            c.buyer_bank_name, c.buyer_bank_code,
            u1.last_name, u1.first_name, u1.middle_name,
            u2.last_name, u2.first_name, u2.middle_name,
            u3.last_name, u3.first_name, u3.middle_name,
            u4.last_name, u4.first_name, u4.middle_name, s.assigned_to
            ORDER BY 
                CASE 
                    WHEN s.status = 'new' THEN 1
                    WHEN s.status = 'processing' THEN 2
                    WHEN s.status = 'partial' THEN 3
                    ELSE 4
                END,
                s.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY`;
        
        const request = dbPool.request();
        request.input('offset', sql.Int, offset);
        request.input('pageSize', sql.Int, parseInt(pageSize));
        request.input('userId', sql.Int, req.user.id);
        
        if (status) {
            request.input('status', sql.NVarChar, status);
        }
        
        const result = await request.query(query);
        
        let totalCount = result.recordset.length > 0 ? result.recordset[0].total_count : 0;
        
        res.json({
            success: true,
            requests: result.recordset,
            total: totalCount,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });
        
    } catch (error) {
        console.error('Ошибка получения заявок на отгрузку:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок: ' + error.message
        });
    }
});

app.get('/api/shipment-requests/:id', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        // Получаем данные заявки
        const result = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .query(`
                SELECT 
                    sr.id,
                    sr.request_number,
                    sr.customer_name,
                    sr.customer_contact,
                    sr.customer_address,
                    sr.customer_unp,
                    sr.customer_phone,
                    sr.customer_director,
                    sr.required_date,
                    sr.status,
                    sr.contract_number,
                    sr.need_vehicle,
                    sr.vehicle_number,
                    sr.trailer_number,
                    sr.waybill_number_ttn,
                    sr.driver_last_name,
                    sr.driver_first_name,
                    sr.driver_middle_name,
                    sr.driver_license,
                    sr.shipping_date,
                    sr.waybill_number,
                    sr.ttn_number,
                    sr.power_of_attorney,
                    sr.notes,
                    sr.created_at,
                    sr.processed_at,
                    sr.completed_at,
                    sr.assigned_to,
                    c.buyer_legal_address,
                    c.buyer_bank_account,
                    c.buyer_bank_name,
                    c.buyer_bank_code,
                    CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
                    CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as processed_by_name,
                    CONCAT(u3.last_name, ' ', u3.first_name, ISNULL(' ' + u3.middle_name, '')) as completed_by_name,
                    CONCAT(u4.last_name, ' ', u4.first_name, ISNULL(' ' + u4.middle_name, '')) as assigned_to_name
                FROM tbl_ShipmentRequests sr
                LEFT JOIN tbl_Contracts c ON sr.id = c.request_id
                LEFT JOIN tbl_Users u1 ON sr.created_by = u1.id
                LEFT JOIN tbl_Users u2 ON sr.processed_by = u2.id
                LEFT JOIN tbl_Users u3 ON sr.completed_by = u3.id
                LEFT JOIN tbl_Users u4 ON sr.assigned_to = u4.id
                WHERE sr.id = @RequestId
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        // Получаем позиции заявки
        const itemsResult = await dbPool.request()
            .input('request_id', sql.Int, requestId)
            .query(`
                SELECT 
                    i.id,
                    i.request_id,
                    i.device_id,
                    i.quantity_requested,
                    i.quantity_shipped,
                    i.price_per_unit,
                    i.status,
                    i.notes,
                    d.unique_id,
                    d.name as device_name,
                    d.category,
                    d.model,
                    d.price
                FROM tbl_ShipmentRequestItems i
                JOIN tbl_Devices d ON i.device_id = d.id
                WHERE i.request_id = @request_id
                ORDER BY d.name
            `);
        
        res.json({
            success: true,
            request: result.recordset[0],
            items: itemsResult.recordset
        });
        
    } catch (error) {
        console.error('Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявки: ' + error.message
        });
    }
});

// 1. Получение списка всех покупателей
app.get('/api/customers', verifyToken, async (req, res) => {
    try {
        // Только для менеджера и админа
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        const result = await dbPool.request()
            .query(`
                SELECT DISTINCT
                    customer_name,
                    customer_unp,
                    customer_address,
                    customer_contact,
                    customer_phone,
                    customer_director,
                    MIN(created_at) as first_order_date,
                    MAX(created_at) as last_order_date,
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
                FROM tbl_ShipmentRequests
                WHERE customer_name IS NOT NULL AND customer_name != ''
                GROUP BY 
                    customer_name,
                    customer_unp,
                    customer_address,
                    customer_contact,
                    customer_phone,
                    customer_director
                ORDER BY customer_name
            `);
        
        res.json({
            success: true,
            customers: result.recordset
        });
        
    } catch (error) {
        console.error('Ошибка получения списка покупателей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения списка покупателей'
        });
    }
});

// 2. Поиск покупателей
app.get('/api/customers/search', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        const { q } = req.query;
        
        if (!q || q.trim() === '') {
            return res.json({ success: true, customers: [] });
        }
        
        const result = await dbPool.request()
            .input('search', sql.NVarChar, `%${q}%`)
            .query(`
                SELECT DISTINCT
                    customer_name,
                    customer_unp,
                    customer_address,
                    customer_contact,
                    customer_phone,
                    customer_director,
                    MIN(created_at) as first_order_date,
                    MAX(created_at) as last_order_date,
                    COUNT(*) as total_orders
                FROM tbl_ShipmentRequests
                WHERE customer_name LIKE @search 
                   OR customer_unp LIKE @search
                   OR customer_contact LIKE @search
                   OR customer_phone LIKE @search
                GROUP BY 
                    customer_name,
                    customer_unp,
                    customer_address,
                    customer_contact,
                    customer_phone,
                    customer_director
                ORDER BY customer_name
            `);
        
        res.json({
            success: true,
            customers: result.recordset
        });
        
    } catch (error) {
        console.error('Ошибка поиска покупателей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка поиска покупателей'
        });
    }
});
// 3. Получение истории взаимодействий с покупателем
app.get('/api/customers/:name/history', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'manager' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        const customerName = decodeURIComponent(req.params.name);
        
        console.log('Поиск истории для покупателя:', customerName);
        
        // Получаем все заявки с таким же названием
        const ordersResult = await dbPool.request()
            .input('customerName', sql.NVarChar, customerName)
            .query(`
                SELECT 
                    id,
                    request_number,
                    customer_name,
                    customer_unp,
                    customer_address,
                    customer_contact,
                    customer_phone,
                    customer_director,
                    created_at,
                    required_date,
                    status,
                    contract_number,
                    need_vehicle,
                    vehicle_number,
                    waybill_number,
                    ttn_number,
                    completed_at,
                    notes,
                    ISNULL((
                        SELECT SUM(quantity_requested) 
                        FROM tbl_ShipmentRequestItems 
                        WHERE request_id = sr.id
                    ), 0) as total_quantity,
                    ISNULL((
                        SELECT SUM(quantity_requested * price_per_unit) 
                        FROM tbl_ShipmentRequestItems 
                        WHERE request_id = sr.id
                    ), 0) as total_amount
                FROM tbl_ShipmentRequests sr
                WHERE customer_name = @customerName
                ORDER BY created_at DESC
            `);
        
        console.log('Найдено заказов:', ordersResult.recordset.length);
        
        // Получаем сводную информацию
        const summaryResult = await dbPool.request()
            .input('customerName', sql.NVarChar, customerName)
            .query(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                    MIN(created_at) as first_order_date,
                    MAX(created_at) as last_order_date
                FROM tbl_ShipmentRequests sr
                WHERE customer_name = @customerName
            `);
        
        // Вычисляем общую сумму
        const spentResult = await dbPool.request()
            .input('customerName', sql.NVarChar, customerName)
            .query(`
                SELECT ISNULL(SUM(i.quantity_requested * i.price_per_unit), 0) as total_spent
                FROM tbl_ShipmentRequests sr
                JOIN tbl_ShipmentRequestItems i ON sr.id = i.request_id
                WHERE sr.customer_name = @customerName
                  AND sr.status IN ('shipped', 'completed')
            `);
        
        const summary = summaryResult.recordset[0] || {
            total_orders: 0,
            completed_orders: 0,
            shipped_orders: 0,
            cancelled_orders: 0,
            first_order_date: null,
            last_order_date: null
        };
        
        summary.total_spent = spentResult.recordset[0]?.total_spent || 0;
        
        console.log('Сводка:', summary);
        
        res.json({
            success: true,
            summary: summary,
            orders: ordersResult.recordset
        });
        
    } catch (error) {
        console.error('Ошибка получения истории покупателя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения истории покупателя: ' + error.message
        });
    }
});

// 32. НАЧАЛО ОБРАБОТКИ ЗАЯВКИ (назначение ответственному)
app.post('/api/shipment-requests/:id/process', verifyToken, requireEmployee, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        // Проверяем, не назначена ли уже заявка кому-то
        const checkResult = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .query(`
                SELECT status, assigned_to 
                FROM tbl_ShipmentRequests 
                WHERE id = @RequestId
            `);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        const request = checkResult.recordset[0];
        
        if (request.status !== 'new') {
            return res.status(400).json({
                success: false,
                message: 'Заявка уже обрабатывается или выполнена'
            });
        }
        
        if (request.assigned_to && request.assigned_to !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Заявка уже назначена другому сотруднику'
            });
        }
        
        // Обновляем заявку: меняем статус и назначаем ответственного
        const result = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .input('ProcessedBy', sql.Int, req.user.id)
            .input('AssignedTo', sql.Int, req.user.id)
            .query(`
                UPDATE tbl_ShipmentRequests 
                SET status = 'processing',
                    processed_by = @ProcessedBy,
                    processed_at = GETDATE(),
                    assigned_to = @AssignedTo
                WHERE id = @RequestId AND status = 'new'
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(400).json({
                success: false,
                message: 'Не удалось назначить заявку'
            });
        }
        
        res.json({
            success: true,
            message: 'Заявка принята в работу и назначена вам'
        });
        
    } catch (error) {
        console.error('Ошибка обработки заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обработки заявки: ' + error.message
        });
    }
});
// Получение списка доступных сотрудников (не занятых)
app.get('/api/users/available-employees', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT 
                    u.id, 
                    u.email,
                    u.last_name,
                    u.first_name,
                    u.middle_name,
                    CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as full_name,
                    u.phone,
                    COUNT(sr.id) as active_requests_count
                FROM tbl_Users u
                LEFT JOIN tbl_ShipmentRequests sr ON u.id = sr.assigned_to 
                    AND sr.status IN ('new', 'processing', 'partial')
                WHERE u.role = 'employee' 
                    AND u.is_active = 1 
                    AND u.is_deleted = 0
                GROUP BY u.id, u.email, u.last_name, u.first_name, u.middle_name, u.phone
                HAVING COUNT(sr.id) < 3
                ORDER BY u.last_name, u.first_name
            `);
        
        res.json({ 
            success: true, 
            employees: result.recordset 
        });
    } catch (error) {
        console.error('Ошибка получения доступных сотрудников:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка получения списка сотрудников' 
        });
    }
});
// 33. ЗАВЕРШЕНИЕ ЗАЯВКИ С ГЕНЕРАЦИЕЙ ДОКУМЕНТОВ
app.post('/api/shipment-requests/:id/complete', verifyToken, requireEmployee, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        console.log('📦 Завершение заявки:', requestId);
        
        const result = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .input('CompletedBy', sql.Int, req.user.id)
            .execute('sp_CompleteShipmentRequest');
        
        const procResult = result.recordset[0];
        
        if (procResult.Success === 0) {
            return res.status(400).json({
                success: false,
                message: procResult.Message
            });
        }
        
        // ДОБАВИТЬ: обновляем shipping_date если отгрузка выполнена
        if (procResult.Status === 'shipped' || procResult.Status === 'partial') {
            await dbPool.request()
                .input('RequestId', sql.Int, requestId)
                .query(`
                    UPDATE tbl_ShipmentRequests 
                    SET shipping_date = CAST(GETDATE() AS DATE)
                    WHERE id = @RequestId AND shipping_date IS NULL
                `);
        }
        
        res.json({
            success: true,
            message: procResult.Message,
            status: procResult.Status
        });
        
    } catch (error) {
        console.error('❌ Ошибка завершения заявки:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка завершения заявки'
        });
    }
});

// 34. ПОЛУЧЕНИЕ ДОКУМЕНТОВ ПО ЗАЯВКЕ
app.get('/api/shipment-requests/:id/documents', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        console.log(`📄 Запрос документов для заявки ${requestId}`);
        
        const requestCheck = await dbPool.request()
            .input('requestId', sql.Int, requestId)
            .query('SELECT id, waybill_number, ttn_number, completed_at FROM tbl_ShipmentRequests WHERE id = @requestId');
        
        if (requestCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        const request = requestCheck.recordset[0];
        const documents = [];
        
        if (request.waybill_number) {
            documents.push({
                id: 1,
                document_type: 'invoice_tn2',
                document_type_name: 'Товарная накладная (ТН-2)',
                document_number: request.waybill_number,
                document_date: request.completed_at,
                reference_id: requestId,
                reference_type: 'shipment'
            });
        }
        
        if (request.ttn_number) {
            documents.push({
                id: 2,
                document_type: 'waybill_ttn1',
                document_type_name: 'Товарно-транспортная накладная (ТТН-1)',
                document_number: request.ttn_number,
                document_date: request.completed_at,
                reference_id: requestId,
                reference_type: 'shipment'
            });
        }
        
        console.log(`Найдено документов: ${documents.length}`);
        
        res.json({
            success: true,
            documents: documents
        });
        
    } catch (error) {
        console.error(' Ошибка получения документов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения документов: ' + error.message
        });
    }
});

// Эндпоинт экспорта документа по заявке
app.get('/api/shipment-requests/:id/export-document', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        const docType = req.query.type;
        const format = req.query.format || 'html';
        
        console.log(`📄 Экспорт документа: requestId=${requestId}, type=${docType}, format=${format}`);
        
        // Получаем данные заявки с ВСЕМИ полями
        const requestResult = await dbPool.request()
    .input('id', sql.Int, requestId)
    .query(`
        SELECT 
            sr.id,
            sr.request_number,
            sr.customer_name,
            sr.customer_unp,
            sr.customer_address,
            sr.customer_contact,
            sr.customer_phone,
            sr.customer_director,
            sr.required_date,
            sr.status,
            sr.contract_number,
            sr.need_vehicle,
            sr.vehicle_number,
            sr.trailer_number,
            sr.waybill_number_ttn,
            CONCAT(sr.driver_last_name, ' ', sr.driver_first_name, ISNULL(' ' + sr.driver_middle_name, '')) as driver_name,
            sr.driver_license,
            sr.shipping_date,
            sr.waybill_number,
            sr.ttn_number,
            sr.power_of_attorney,
            sr.notes,
            sr.created_at,
            sr.processed_at,
            sr.completed_at,
            sr.completed_by,
            sr.created_by,
            CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
            CONCAT(u2.last_name, ' ', u2.first_name, ISNULL(' ' + u2.middle_name, '')) as completed_by_name,
            (SELECT SUM(quantity_requested * price_per_unit) FROM tbl_ShipmentRequestItems WHERE request_id = sr.id) as total_amount
        FROM tbl_ShipmentRequests sr
        LEFT JOIN tbl_Users u1 ON sr.created_by = u1.id
        LEFT JOIN tbl_Users u2 ON sr.completed_by = u2.id
        WHERE sr.id = @id
    `);
        
        if (requestResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        const request = requestResult.recordset[0];
        
        // Получаем позиции заявки
        const itemsResult = await dbPool.request()
            .input('request_id', sql.Int, requestId)
            .query(`
                SELECT 
                    i.id,
                    i.request_id,
                    i.device_id,
                    i.quantity_requested,
                    i.quantity_shipped,
                    i.price_per_unit,
                    i.status,
                    i.notes,
                    d.name,
                    d.model,
                    d.unique_id
                FROM tbl_ShipmentRequestItems i
                JOIN tbl_Devices d ON i.device_id = d.id
                WHERE i.request_id = @request_id
            `);
        
        const items = itemsResult.recordset;
        
        // Определяем тип документа на основе need_vehicle
        let actualDocType = docType;
        if (!actualDocType) {
            if (request.need_vehicle === 1 || request.need_vehicle === true) {
                actualDocType = 'ttn1';
            } else {
                actualDocType = 'tn2';
            }
        }
        
        console.log(`📄 Генерация документа: ${actualDocType}, формат: ${format}`);
        
        if (actualDocType === 'tn2') {
            await exportTN2Document(request, items, format, res, req);
        } else if (actualDocType === 'ttn1') {
            await exportTTN1Document(request, items, format, res, req, false);
        } else {
            res.status(400).json({
                success: false,
                message: 'Неверный тип документа. Используйте tn2 или ttn1'
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка экспорта документа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта документа: ' + error.message
        });
    }
});
app.get('/api/reports/movements', verifyToken, async (req, res) => {
    try {
        const { start_date, end_date, device_id, movement_type } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Укажите начальную и конечную дату'
            });
        }
        
        let query = `
            SELECT 
                sm.id,
                sm.movement_date,
                sm.movement_type,
                sm.quantity_change,
                sm.previous_quantity,
                sm.new_quantity,
                sm.notes,
                sm.document_number,
                sm.performed_by,
                CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as performed_by_name,
                d.id as device_id,
                d.unique_id,
                d.name as device_name,
                d.category,
                d.model,
                d.manufacturer
            FROM tbl_StockMovements sm
            JOIN tbl_Devices d ON sm.device_id = d.id
            LEFT JOIN tbl_Users u ON sm.performed_by = u.id
            WHERE CAST(sm.movement_date AS DATE) >= @start_date
                AND CAST(sm.movement_date AS DATE) <= @end_date
        `;
        
        const request = dbPool.request();
        request.input('start_date', sql.Date, start_date);
        request.input('end_date', sql.Date, end_date);
        
        if (device_id && device_id !== 'all') {
            query += ` AND sm.device_id = @device_id`;
            request.input('device_id', sql.Int, parseInt(device_id));
        }
        
        if (movement_type && movement_type !== 'all') {
            if (movement_type === 'поступление') {
                query += ` AND sm.movement_type LIKE '%поступление%'`;
            } else {
                query += ` AND sm.movement_type = @movement_type`;
                request.input('movement_type', sql.NVarChar, movement_type);
            }
        }
        
        query += ` ORDER BY sm.movement_date DESC`;
        
        const result = await request.query(query);
        
        // Получаем статистику по движениям
        let statsQuery = `
            SELECT 
                COUNT(*) as total_movements,
                SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) as total_incoming,
                SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END) as total_outgoing,
                COUNT(DISTINCT device_id) as devices_count
            FROM tbl_StockMovements sm
            WHERE CAST(sm.movement_date AS DATE) >= @start_date
                AND CAST(sm.movement_date AS DATE) <= @end_date
        `;
        
        const statsRequest = dbPool.request();
        statsRequest.input('start_date', sql.Date, start_date);
        statsRequest.input('end_date', sql.Date, end_date);
        
        if (device_id && device_id !== 'all') {
            statsQuery += ` AND sm.device_id = @device_id`;
            statsRequest.input('device_id', sql.Int, parseInt(device_id));
        }
        
        if (movement_type && movement_type !== 'all') {
            if (movement_type === 'поступление') {
                statsQuery += ` AND sm.movement_type LIKE '%поступление%'`;
            } else {
                statsQuery += ` AND sm.movement_type = @movement_type`;
                statsRequest.input('movement_type', sql.NVarChar, movement_type);
            }
        }
        
        const statsResult = await statsRequest.query(statsQuery);
        
        res.json({
            success: true,
            movements: result.recordset,
            stats: statsResult.recordset[0],
            start_date: start_date,
            end_date: end_date
        });
        
    } catch (error) {
        console.error('Ошибка получения отчета по движениям:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения отчета: ' + error.message
        });
    }
});
app.get('/api/reports/movements/export', verifyToken, async (req, res) => {
    try {
        const { format, start_date, end_date, device_id, movement_type } = req.query;
        
        let query = `
            SELECT 
                FORMAT(sm.movement_date, 'dd.MM.yyyy HH:mm') as date,
                d.unique_id as device_code,
                d.name as device_name,
                sm.movement_type,
                sm.quantity_change,
                sm.previous_quantity,
                sm.new_quantity,
                CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as performed_by,
                sm.document_number,
                sm.notes
            FROM tbl_StockMovements sm
            JOIN tbl_Devices d ON sm.device_id = d.id
            LEFT JOIN tbl_Users u ON sm.performed_by = u.id
            WHERE CAST(sm.movement_date AS DATE) >= @start_date
                AND CAST(sm.movement_date AS DATE) <= @end_date
        `;
        
        const request = dbPool.request();
        request.input('start_date', sql.Date, start_date);
        request.input('end_date', sql.Date, end_date);
        
        if (device_id && device_id !== 'all') {
            query += ` AND sm.device_id = @device_id`;
            request.input('device_id', sql.Int, parseInt(device_id));
        }
        
        if (movement_type && movement_type !== 'all') {
            if (movement_type === 'поступление') {
                query += ` AND sm.movement_type LIKE '%поступление%'`;
            } else {
                query += ` AND sm.movement_type = @movement_type`;
                request.input('movement_type', sql.NVarChar, movement_type);
            }
        }
        
        query += ` ORDER BY sm.movement_date DESC`;
        
        const result = await request.query(query);
        
        if (format === 'excel') {
            const workbook = XLSX.utils.book_new();
            
            const worksheet_data = [
                ['ОТЧЕТ ПО ДВИЖЕНИЯМ ТОВАРОВ'],
                [`Период: ${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`],
                [`Дата формирования: ${new Date().toLocaleString()}`],
                [],
                ['Дата', 'Артикул', 'Наименование', 'Тип операции', 'Количество', 'Было', 'Стало', 'Кто выполнил', 'Документ', 'Примечание']
            ];
            
            result.recordset.forEach(row => {
                worksheet_data.push([
                    row.date,
                    row.device_code,
                    row.device_name,
                    row.movement_type,
                    row.quantity_change,
                    row.previous_quantity,
                    row.new_quantity,
                    row.performed_by,
                    row.document_number || '',
                    row.notes || ''
                ]);
            });
            
            const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
            
            // Настройка ширины колонок
            worksheet['!cols'] = [
                { wch: 19 }, // Дата
                { wch: 15 }, // Артикул
                { wch: 30 }, // Наименование
                { wch: 15 }, // Тип операции
                { wch: 12 }, // Количество
                { wch: 10 }, // Было
                { wch: 10 }, // Стало
                { wch: 25 }, // Кто выполнил
                { wch: 20 }, // Документ
                { wch: 40 }  // Примечание
            ];
            
            // Объединение ячеек для заголовка
            worksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }
            ];
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Движения товаров');
            
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="movements_report_${start_date}_${end_date}.xlsx"`);
            res.send(excelBuffer);
            
        } else if (format === 'docx') {
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Отчет по движениям товаров</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        h1 { text-align: center; color: #333; }
                        .info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background-color: #4CAF50; color: white; padding: 10px; border: 1px solid #ddd; }
                        td { padding: 8px; border: 1px solid #ddd; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                    </style>
                </head>
                <body>
                    <h1>Отчет по движениям товаров</h1>
                    <div class="info">
                        <strong>Период:</strong> ${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}<br>
                        <strong>Дата формирования:</strong> ${new Date().toLocaleString()}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Артикул</th>
                                <th>Наименование</th>
                                <th>Тип</th>
                                <th>Кол-во</th>
                                <th>Было</th>
                                <th>Стало</th>
                                <th>Кто</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            result.recordset.forEach(row => {
                const changeClass = row.quantity_change > 0 ? 'color: green;' : 'color: red;';
                const changeSign = row.quantity_change > 0 ? '+' : '';
                
                htmlContent += `
                    <tr>
                        <td>${row.date}</td>
                        <td>${row.device_code}</td>
                        <td>${row.device_name}</td>
                        <td>${row.movement_type}</td>
                        <td style="${changeClass}">${changeSign}${row.quantity_change}</td>
                        <td>${row.previous_quantity}</td>
                        <td>${row.new_quantity}</td>
                        <td>${row.performed_by}</td>
                    </tr>
                `;
            });
            
            htmlContent += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            res.setHeader('Content-Type', 'application/msword');
            res.setHeader('Content-Disposition', `attachment; filename="movements_report_${start_date}_${end_date}.doc"`);
            res.send(blob);
        } else {
            res.status(400).json({
                success: false,
                message: 'Неподдерживаемый формат. Используйте excel или docx'
            });
        }
        
    } catch (error) {
        console.error('Ошибка экспорта отчета:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта отчета: ' + error.message
        });
    }
});

app.get('/api/reports/devices-list', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT id, unique_id, name, category
                FROM tbl_Devices
                WHERE status = 'active'
                ORDER BY name
            `);
        
        res.json({
            success: true,
            devices: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения списка приборов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения списка приборов'
        });
    }
});

async function generateTN2Document(request, items, format, res, req) {
    // Получаем данные сотрудника, который завершил отгрузку
    let completedByUser = null;
    if (request.completed_by) {
        const userResult = await dbPool.request()
            .input('userId', sql.Int, request.completed_by)
            .query('SELECT full_name, position FROM tbl_Users WHERE id = @userId');
        
        if (userResult.recordset.length > 0) {
            completedByUser = userResult.recordset[0];
        }
    }
    
    // ИСПРАВЛЕНО: используем docDate вместо documentDate
    const docDate = request.completed_at || request.created_at || new Date();
    const formattedDate = new Date(docDate).toLocaleDateString('ru-RU');
    
    const documentData = {
        number: request.waybill_number,
        date: formattedDate,
        seller_name: 'НПУП «АТОМТЕХ»',
        seller_address: 'г. Минск, ул. Гикало, 5',
        seller_unp: '123456789',
        buyer_name: request.customer_name || '',
        buyer_address: request.customer_address || '',
        buyer_unp: request.customer_unp || '',
        contract_number: request.contract_number || 'б/н',
        items: items.map(item => ({
            name: item.name,
            model: item.model || '',
            unique_id: item.unique_id,
            quantity: item.quantity_shipped || item.quantity_requested,
            price: item.price_per_unit,
            amount: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit,
            vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 0.2,
            amount_with_vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 1.2
        })),
        vehicle: request.vehicle_number || '',
        driver: request.driver_name || '',
        completed_by_user: completedByUser
    };
    
    const safeFileName = `TN2_${request.waybill_number || request.id}`.replace(/[^a-zA-Z0-9\-]/g, '_');
    
    if (format === 'excel') {
        const excelBuffer = await generateExcelDocument({ document_type: 'invoice_tn2' }, documentData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
        res.send(excelBuffer);
    } else if (format === 'docx') {
        const docxBuffer = await generateDocxDocument({ document_type: 'invoice_tn2' }, documentData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
        res.send(docxBuffer);
    } else if (format === 'html') {
        const html = generateHtmlContent({ document_type: 'invoice_tn2' }, documentData, completedByUser);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
        res.send(html);
    }
}


async function generateTTN1Document(request, items, format, res, req) {
    // Получаем данные сотрудника, завершившего отгрузку
    let completedByUser = null;
    if (request.completed_by) {
        const userResult = await dbPool.request()
            .input('userId', sql.Int, request.completed_by)
            .query('SELECT full_name, position FROM tbl_Users WHERE id = @userId');
        
        if (userResult.recordset.length > 0) {
            completedByUser = userResult.recordset[0];
        }
    }
    
    // ИСПРАВЛЕНО: используем docDate вместо documentDate
    const docDate = request.completed_at || request.created_at || new Date();
    const formattedDate = new Date(docDate).toLocaleDateString('ru-RU');
    
    // Номер документа
    const docYear = docDate.getFullYear();
    const docMonth = String(docDate.getMonth() + 1).padStart(2, '0');
    const docDay = String(docDate.getDate()).padStart(2, '0');
    const documentNumber = request.ttn_number || `ТТН-${docYear}${docMonth}${docDay}-${String(request.id).slice(-4)}`;
    
    const documentData = {
        number: documentNumber,
        date: formattedDate,
        contract_number: request.contract_number || '',
        consignor_name: 'НПУП «АТОМТЕХ»',
        consignor_address: 'г. Минск, ул. Гикало, 5',
        consignor_unp: '123456789',
        consignee_name: request.customer_name || '',
        consignee_address: request.customer_address || '',
        consignee_unp: request.customer_unp || '',
        vehicle: request.vehicle_number || '______________',
        trailer: request.trailer_number || '',
        waybill_number: request.waybill_number_ttn || '',
        driver: request.driver_name || '______________',
        power_of_attorney: request.power_of_attorney || '',
        destination: request.customer_address || '',
        completed_by_user: completedByUser,
        shipping_date: request.shipping_date || request.completed_at || request.created_at,
        items: items.map(item => ({
            name: item.name,
            model: item.model || '',
            unique_id: item.unique_id,
            quantity: item.quantity_shipped || item.quantity_requested,
            price: item.price_per_unit,
            amount: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit,
            vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 0.2,
            amount_with_vat: (item.quantity_shipped || item.quantity_requested) * item.price_per_unit * 1.2,
            weight: (item.quantity_shipped || item.quantity_requested) * 2
        }))
    };
    
    const safeFileName = `TTN1_${documentNumber}`.replace(/[^a-zA-Z0-9\-]/g, '_');
    
    if (format === 'excel') {
        const excelBuffer = await generateExcelDocument({ document_type: 'waybill_ttn1' }, documentData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
        res.send(excelBuffer);
    } else if (format === 'docx') {
        const docxBuffer = await generateTtn1DocxDocument(documentData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
        res.send(docxBuffer);
    } else if (format === 'html') {
        const html = generateTtn1HtmlContent(documentData);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
        res.send(html);
    }
}

/**
 * Вспомогательная функция для преобразования числа в сумму прописью
 */
function numberToWords(number) {
    const num = Math.floor(number);
    if (num === 0) return 'Ноль';
    
    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    
    function getUnits(num, isFemale = false) {
        const arr = isFemale ? unitsFemale : units;
        return arr[num] || '';
    }
    
    function convertHundreds(n, isFemale = false) {
        let result = '';
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        
        if (h > 0) result += hundreds[h] + ' ';
        
        if (t === 1) {
            result += teens[u] + ' ';
        } else {
            if (t > 1) result += tens[t] + ' ';
            if (u > 0) result += getUnits(u, isFemale) + ' ';
        }
        
        return result.trim();
    }
    
    function convertThousands(n) {
        const thousands = Math.floor(n / 1000);
        if (thousands === 0) return '';
        
        let result = '';
        const lastDigit = thousands % 10;
        const lastTwoDigits = thousands % 100;
        
        result += convertHundreds(thousands, true) + ' ';
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            result += 'тысяч ';
        } else if (lastDigit === 1) {
            result += 'тысяча ';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            result += 'тысячи ';
        } else {
            result += 'тысяч ';
        }
        
        return result;
    }
    
    let result = '';
    const billions = Math.floor(num / 1000000000);
    const millions = Math.floor((num % 1000000000) / 1000000);
    const thousands = Math.floor((num % 1000000) / 1000);
    const rest = num % 1000;
    
    if (billions > 0) {
        result += convertHundreds(billions) + ' ';
        const lastDigit = billions % 10;
        const lastTwoDigits = billions % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            result += 'миллиардов ';
        } else if (lastDigit === 1) {
            result += 'миллиард ';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            result += 'миллиарда ';
        } else {
            result += 'миллиардов ';
        }
    }
    
    if (millions > 0) {
        result += convertHundreds(millions) + ' ';
        const lastDigit = millions % 10;
        const lastTwoDigits = millions % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            result += 'миллионов ';
        } else if (lastDigit === 1) {
            result += 'миллион ';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            result += 'миллиона ';
        } else {
            result += 'миллионов ';
        }
    }
    
    if (thousands > 0) {
        result += convertThousands(num % 1000000);
    }
    
    if (rest > 0) {
        result += convertHundreds(rest);
    }
    
    return result.trim();
}

function generateTtn1HtmlContent(data) {
    // Функция для безопасного экранирования (кавычки НЕ заменяются)
    function escapeText(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    
    let totalAmount = 0, totalVat = 0, totalWithVat = 0, totalWeight = 0, totalItems = 0;
    
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            totalAmount += item.amount || 0;
            totalVat += item.vat || 0;
            totalWithVat += item.amount_with_vat || 0;
            totalWeight += item.weight || 0;
            totalItems += item.quantity || 0;
        });
    }
    
    // Определяем тип документа (пополнение или отгрузка)
    const isReplenishment = data.request_type === 'replenishment';
    
    // Данные сотрудника, завершившего операцию
    const userFullName = (data.completed_by_user && data.completed_by_user.full_name) ? data.completed_by_user.full_name : '______________________';
    const userPosition = (data.completed_by_user && data.completed_by_user.position) ? data.completed_by_user.position : 'Кладовщик';
    
    // Данные для раздела II (Погрузочно-разгрузочные операции)
    const shippingDate = data.shipping_date ? new Date(data.shipping_date) : new Date();
    const currentDateStr = shippingDate.toLocaleDateString('ru-RU');
    const currentTimeStr = shippingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Для ПОПОЛНЕНИЯ: дата и время погрузки (в прошлом - на 1 час раньше)
    const pastDate = new Date(shippingDate);
    pastDate.setHours(pastDate.getHours() - 5);
    const pastDateStr = pastDate.toLocaleDateString('ru-RU');
    const pastTimeStr = pastDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const pastDateTime = `${pastDateStr} ${pastTimeStr}`;
    
    // Для текущей даты/времени (разгрузка при пополнении)
    const currentDateTime = `${currentDateStr} ${currentTimeStr}`;
    
    // Для отгрузки: время прибытия пустое, время убытия = время отгрузки
    const departureDateTime = `${currentDateStr} ${currentTimeStr}`;
    const arrivalDateTime = '';
    
    // Разбираем автомобиль (марка + номер)
    let vehicleMake = '';
    let vehicleNumber = '';
    const vehicleFull = data.vehicle || '';
    const vehicleMatch = vehicleFull.match(/^([A-Za-zА-Яа-я0-9\-]+)\s+([A-Za-z0-9\-]+)$/);
    if (vehicleMatch) {
        vehicleMake = vehicleMatch[1];
        vehicleNumber = vehicleMatch[2];
    } else {
        vehicleMake = vehicleFull;
        vehicleNumber = '';
    }
    
    // Разбираем прицеп (марка + номер)
    let trailerMake = '';
    let trailerNumber = '';
    const trailerFull = data.trailer || '';
    const trailerMatch = trailerFull.match(/^([A-Za-zА-Яа-я0-9\-]+)\s+([A-Za-z0-9\-]+)$/);
    if (trailerMatch) {
        trailerMake = trailerMatch[1];
        trailerNumber = trailerMatch[2];
    } else {
        trailerMake = trailerFull;
        trailerNumber = '';
    }
    
    let consignorName = '';
    let consignorAddress = '';
    let consignorUnp = '332279933';
    
    if (isReplenishment) {
        consignorName = 'НПУП «АТОМТЕХ» (Производство)';
        consignorAddress = 'г. Минск, ул. Производственная, 10';
    } else {
        consignorName = data.consignor_name || 'НПУП «АТОМТЕХ»';
        consignorAddress = data.consignor_address || 'г. Минск, ул. Гикало, 5';
        consignorUnp = data.consignor_unp || '332279933';
    }
    
    let itemsHtml = '';
    data.items.forEach((item, index) => {
        const amount = item.amount;
        const weight = item.weight;
        
        if (isReplenishment) {
            itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 6px;">${escapeText(item.name)} ${escapeText(item.model || '')}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">шт</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.quantity}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.price.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${amount.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.quantity}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${weight.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px;">&nbsp;</noscript>
            </tr>
            `;
        } else {
            const vat = item.vat;
            const amountWithVat = item.amount_with_vat;
            itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 6px;">${escapeText(item.name)} ${escapeText(item.model || '')}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">шт</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.quantity}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.price.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${amount.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">20</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${vat.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${amountWithVat.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.quantity}</noscript>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${weight.toFixed(2)}</noscript>
                <td style="border: 1px solid #000; padding: 6px;">&nbsp;</noscript>
            </tr>
            `;
        }
    });
    
    // Функция для преобразования числа в пропись
    function numberToWordsRu(num) {
        if (num === 0 || isNaN(num)) return 'ноль';
        
        const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        
        function getUnits(num, isFemale = false) {
            const arr = isFemale ? unitsFemale : units;
            return arr[num] || '';
        }
        
        function convertHundreds(n, isFemale = false) {
            let result = '';
            const h = Math.floor(n / 100);
            const t = Math.floor((n % 100) / 10);
            const u = n % 10;
            
            if (h > 0) result += hundreds[h] + ' ';
            if (t === 1) {
                result += teens[u] + ' ';
            } else {
                if (t > 1) result += tens[t] + ' ';
                if (u > 0) result += getUnits(u, isFemale) + ' ';
            }
            return result.trim();
        }
        
        function convertNumber(n) {
            let result = '';
            const millions = Math.floor(n / 1000000);
            const thousands = Math.floor((n % 1000000) / 1000);
            const rest = n % 1000;
            
            if (millions > 0) {
                result += convertHundreds(millions) + ' ';
                const lastDigit = millions % 10;
                const lastTwo = millions % 100;
                if (lastTwo >= 11 && lastTwo <= 19) result += 'миллионов ';
                else if (lastDigit === 1) result += 'миллион ';
                else if (lastDigit >= 2 && lastDigit <= 4) result += 'миллиона ';
                else result += 'миллионов ';
            }
            
            if (thousands > 0) {
                result += convertHundreds(thousands, true) + ' ';
                const lastDigit = thousands % 10;
                const lastTwo = thousands % 100;
                if (lastTwo >= 11 && lastTwo <= 19) result += 'тысяч ';
                else if (lastDigit === 1) result += 'тысяча ';
                else if (lastDigit >= 2 && lastDigit <= 4) result += 'тысячи ';
                else result += 'тысяч ';
            }
            
            if (rest > 0) {
                result += convertHundreds(rest);
            }
            return result.trim();
        }
        
        return convertNumber(Math.floor(num));
    }
    
    // Для пополнения - основание отпуска
    const replenishmentBasis = 'Пополнение запасов склада';
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>ТТН-1 №${escapeText(data.number)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            margin: 15mm;
            line-height: 1.2;
        }
        h1 {
            font-size: 16pt;
            text-align: center;
            font-weight: bold;
            margin-bottom: 30px;
        }
        h2 {
            font-size: 14pt;
            text-align: center;
            font-weight: bold;
            margin: 25px 0 15px 0;
        }
        .parties-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 30px 0;
        }
        .parties-table {
            width: 50%;
            border-collapse: collapse;
        }
        .parties-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 12pt;
        }
        .parties-table .header {
            font-weight: bold;
            background-color: #f0f0f0;
            font-size: 12pt;
        }
        .unp-label {
            font-weight: bold;
            margin-right: 15px;
            white-space: nowrap;
            font-size: 12pt;
        }
        .field-block {
            margin-bottom: 15px;
        }
        .field-name {
            font-weight: bold;
            margin-bottom: 3px;
            font-size: 14pt;
        }
        .field-line {
            border-bottom: 1px solid #000;
            width: 100%;
            min-height: 17px;
            margin: 2px 0;
            font-size: 12pt;
        }
        .field-hint {
            font-size: 10pt;
            color: #555;
            margin-top: 2px;
        }
        .two-columns {
            display: flex;
            gap: 30px;
            margin-bottom: 15px;
        }
        .column {
            flex: 1;
        }
        .three-columns {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #000;
            padding: 4px;
        }
        .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
            font-size: 12pt;
        }
        .items-table td {
            font-size: 12pt;
        }
        .totals {
            margin: 10px 0;
            font-weight: bold;
            font-size: 14pt;
        }
        .signatures {
            margin-top: 25px;
        }
        .signature-row {
            margin: 15px 0;
        }
        .signature-left {
            display: inline-block;
            width: 48%;
        }
        .signature-right {
            display: inline-block;
            width: 48%;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            display: inline-block;
            min-width: 200px;
            margin-left: 10px;
        }
        .signature-name {
            font-weight: bold;
            display: inline-block;
            min-width: 150px;
            font-size: 14pt;
        }
        hr {
            margin: 10px 0;
            border: none;
            border-top: 1px solid #000;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
    </style>
</head>
<body>
    <h1>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ  ${escapeText(data.number)} от ${escapeText(data.date)}</h1>
    
    <!-- Таблица с заголовками и значениями УНП -->
    <div class="parties-wrapper">
        <div style="display: flex; flex-direction: column; align-items: flex-start; margin-right: 15px;">
            <span style="height: 38px;"></span>
            <span class="unp-label">УНП</span>
        </div>
        <table class="parties-table">
            <tr>
                <td class="header" style="width: 25%;">Грузоотправитель</td>
                <td class="header" style="width: 25%;">Грузополучатель</td>
                <td class="header" style="width: 25%;">Заказчик автомобильной перевозки (плательщик)</td>
            </tr>
            <tr>
                <td>${escapeText(consignorUnp)}</td>
                <td>${escapeText(data.consignee_unp || '')}</td>
                <td>${escapeText(data.consignee_unp || '')}</td>
            </tr>
         </table>
    </div>

    <!-- Строка с датой -->
    <div style="width: 40%; margin: 10px 0 20px 0;">
        <div style="font-size: 14pt; font-weight: bold;">${escapeText(data.date)}</div>
    </div>
    
    <!-- Автомобиль, Прицеп, К путевому листу -->
    <div class="three-columns">
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Автомобиль</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(vehicleMake)} ${escapeText(vehicleNumber)}</span>
            </div>
            <div class="field-hint" style="margin-left: 110px;">(марка, регистрационный знак)</div>
        </div>
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Прицеп</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(trailerMake)} ${escapeText(trailerNumber)}</span>
            </div>
            <div class="field-hint" style="margin-left: 75px;">(марка, регистрационный знак)</div>
        </div>
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">К путевому листу №</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(data.waybill_number || '')}</span>
            </div>
        </div>
    </div>

    <!-- Водитель -->
    <div class="two-columns">
        <div class="column">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Водитель</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(data.driver || '')}</span>
            </div>
            <div class="field-hint" style="margin-left: 90px;">(фамилия, имя, отчество)</div>
        </div>
    </div>
    
    <!-- Заказчик автомобильной перевозки -->
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Заказчик автомобильной перевозки (плательщик)</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(data.consignee_name)}, ${escapeText(data.consignee_address)}</span>
        </div>
        <div class="field-hint" style="margin-left: 440px;">(наименование, адрес)</div>
    </div>
    
    <!-- Грузоотправитель -->
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Грузоотправитель</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(consignorName)}, ${escapeText(consignorAddress)}</span>
        </div>
        <div class="field-hint" style="margin-left: 165px;">(наименование, адрес)</div>
    </div>
    
    <!-- Грузополучатель -->
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Грузополучатель</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(data.consignee_name)}, ${escapeText(data.consignee_address)}</span>
        </div>
        <div class="field-hint" style="margin-left: 155px;">(наименование, адрес)</div>
    </div>
    
    <!-- Основание отпуска, пункты погрузки/разгрузки -->
    <div class="three-columns" style="display: flex; gap: 15px;">
        <div class="column" style="flex: 2;">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Основание отпуска</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${isReplenishment ? replenishmentBasis : 'Договор поставки № ' + escapeText(data.contract_number || '') + ' от ' + escapeText(data.date || '')}</span>
            </div>
            <div class="field-hint" style="margin-left: 170px;">(дата и номер договора или основание)</div>
        </div>
        <div class="column" style="flex: 1;">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Пункт погрузки</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${isReplenishment ? consignorAddress : escapeText(data.consignor_address)}</span>
            </div>
            <div class="field-hint" style="margin-left: 145px;">(адрес)</div>
        </div>
        <div class="column" style="flex: 1;">
            <div style="display: flex; align-items: baseline;">
                <span class="field-name" style="white-space: nowrap;">Пункт разгрузки</span>
                <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;">${escapeText(data.destination || data.consignee_address)}</span>
            </div>
            <div class="field-hint" style="margin-left: 150px;">(адрес)</div>
        </div>
    </div>
    
    <!-- Переадресовка -->
    <div class="field-block">
        <div style="display: flex; align-items: baseline;">
            <span class="field-name" style="white-space: nowrap;">Переадресовка</span>
            <span class="field-line" style="border-bottom: 1px solid #000; flex: 1; margin-left: 10px;"></span>
        </div>
        <div class="field-hint" style="margin-left: 130px;">(наименование, адрес нового получателя, фамилия, инициалы, подпись уполномоченного должностного лица)</div>
    </div>
    
    <!-- Товарный раздел -->
    <h2>I. ТОВАРНЫЙ РАЗДЕЛ</h2>
    
    ${isReplenishment ? `
    <table class="items-table" style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Наименование товара</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Единица измерения</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Количество</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Цена, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Стоимость, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Количество грузовых мест</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Масса груза, кг</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Примечание</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">1</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">2</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">3</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">4</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">5</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">6</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">7</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">8</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <tr style="font-weight: bold;">
                <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalItems}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalAmount.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalItems}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalWeight.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px;">&nbsp;</td>
             </tr>
        </tbody>
     </table>
    ` : `
    <table class="items-table" style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Наименование товара</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Единица измерения</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Количество</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Цена, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Стоимость, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Ставка НДС, %</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Сумма НДС, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Стоимость с НДС, руб. коп.</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Количество грузовых мест</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Масса груза, кг</th>
                <th style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Примечание</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th>
             </tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <tr style="font-weight: bold;">
                <td colspan="2" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalItems}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalAmount.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">&nbsp;</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalVat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalWithVat.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalItems}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${totalWeight.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px;">&nbsp;</td>
             </tr>
        </tbody>
     </table>
    `}
    
    <!-- Итоги с прописью -->
    <div class="totals" style="margin: 20px 0;">
        ${!isReplenishment ? `
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего сумма НДС</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalVat.toFixed(2)} руб. (${numberToWordsRu(Math.floor(totalVat))} рублей ${Math.round((totalVat % 1) * 100)} копеек)
            </div>
        </div>
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего стоимость с НДС</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalWithVat.toFixed(2)} руб. (${numberToWordsRu(Math.floor(totalWithVat))} рублей ${Math.round((totalWithVat % 1) * 100)} копеек)
            </div>
        </div>
        ` : ''}
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего масса груза</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalWeight.toFixed(2)} кг (${numberToWordsRu(Math.floor(totalWeight))} килограмм)
            </div>
        </div>
        <div style="display: flex; align-items: baseline; margin-bottom: 20px;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего количество грузовых мест</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">
                ${totalItems} (${numberToWordsRu(totalItems)} мест)
            </div>
        </div>
    </div>
    
    <!-- II. ПОГРУЗОЧНО-РАЗГРУЗОЧНЫЕ ОПЕРАЦИИ -->
    <h2>II. ПОГРУЗОЧНО-РАЗГРУЗОЧНЫЕ ОПЕРАЦИИ</h2>

    <table class="items-table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
            <tr>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Операция</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Исполнитель</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Способ (ручной, механизированный)</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Код</th>
                <th colspan="3" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Дата, время (ч, мин)</th>
                <th colspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Дополнительные операции</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Подпись</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">прибытия</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">убытия</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">простоя</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">время</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">наименование</th>
              </td>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;"></th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">12</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">13</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">14</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">15</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">16</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">17</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">18</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">19</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">20</th>
            </tr>
        </thead>
        <tbody>
            ${isReplenishment ? `
            <!-- Для ПОПОЛНЕНИЯ: погрузка в прошлом, разгрузка в настоящем -->
            <tr>
                <td style="border: 1px solid #000; padding: 8px;">Погрузка</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${escapeText(consignorName)}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">механизированный</noscript>
                <td style="border: 1px solid #000; padding: 8px;">01</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${pastDateTime}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${pastDateTime}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">0</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;">Разгрузка</noscript>
                <td style="border: 1px solid #000; padding: 8px;">НПУП «АТОМТЕХ» (Склад)</noscript>
                <td style="border: 1px solid #000; padding: 8px;">механизированный</noscript>
                <td style="border: 1px solid #000; padding: 8px;">02</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${currentDateTime}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${currentDateTime}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">0</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            ` : `
            <!-- Для ОТГРУЗКИ: погрузка с временем убытия, разгрузка пустая -->
            <tr>
                <td style="border: 1px solid #000; padding: 8px;">Погрузка</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${escapeText(consignorName)}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">механизированный</noscript>
                <td style="border: 1px solid #000; padding: 8px;">01</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${arrivalDateTime}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${departureDateTime}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">0</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;">Разгрузка</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${escapeText(data.consignee_name || 'Грузополучатель')}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">механизированный</noscript>
                <td style="border: 1px solid #000; padding: 8px;">02</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            `}
        </tbody>
    </table>
    
    <!-- Транспортные услуги -->
    <div style="display: flex; align-items: baseline; margin: 20px 0 30px 0;">
        <div style="font-size: 14pt; width: 250px; font-weight: bold;">Транспортные услуги</div>
        <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>
    </div>
    
    <!-- III. ПРОЧИЕ СВЕДЕНИЯ (заполняется перевозчиком) -->
    <h2>III. ПРОЧИЕ СВЕДЕНИЯ (заполняется перевозчиком)</h2>
    
    <table class="items-table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
            <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt; text-align: center; font-weight: bold;">Расстояние перевозки по группам дорог, км</noscript>
                <td rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt; text-align: center; font-weight: bold;">Код экспе-<br>дирования</noscript>
                <td rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt; text-align: center; font-weight: bold;">За транспорт-<br>ные услуги</noscript>
                <td colspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt; text-align: center; font-weight: bold;">Поправочный коэффициент</noscript>
                <td rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt; text-align: center; font-weight: bold;">Штраф</noscript>
                <td rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt; text-align: center; font-weight: bold;"></noscript>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">всего</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">в городе</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">I</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">II</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">III</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">расценки водителю</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">основной тариф</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">21</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">22</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">23</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">24</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">25</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">26</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">27</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">28</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">29</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">30</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">31</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
        </tbody>
    </table>
    
    <!-- Отметки о составленных актах -->
    <div style="display: flex; align-items: baseline; margin: 20px 0 30px 0;">
        <div style="font-size: 14pt; width: 300px; font-weight: bold;">Отметки о составленных актах</div>
        <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>
    </div>
    
    <!-- Расчет стоимости -->
    <table class="items-table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
            <tr>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Расчет стоимости</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">За тонны</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">За расстояние перевозки</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">За специальный транспорт</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">За транспортные услуги</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Погрузочно-<br>разгрузочные<br>работы, т</th>
                <th colspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Сверхнормативный простой</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Прочие доплаты</th>
                <th rowspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">Дополнитель-<br>ные услуги<br>(экспедиро-<br>вание)</th>
                <th colspan="2" style="border: 1px solid #000; padding: 6px; background-color: #f0f0f0; font-size: 11pt;">К оплате</th>
            </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">погрузка</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">разгрузка</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">итого</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">в том числе ТЭП</th>
              </tr>
            <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;"></th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">32</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">33</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">34</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">35</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">36</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">37</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">38</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">39</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">40</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">41</th>
                <th style="border: 1px solid #000; padding: 4px; font-size: 10pt;">42</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">По заказу</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Выполнено</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">Расценка</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">К оплате</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
                <td style="border: 1px solid #000; padding: 8px;">&nbsp;</noscript>
            </tr>
        </tbody>
    </table>
    
    <!-- Таксировка -->
    <div style="display: flex; align-items: baseline; margin: 20px 0 30px 0;">
        <div style="font-size: 14pt; width: 250px; font-weight: bold;">Таксировка</div>
        <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>
    </div>
    
    <!-- ========== ПОДПИСИ ========== -->
    <div class="signatures" style="margin-top: 30px;">
        
        <!-- Отпуск разрешил -->
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Отпуск разрешил</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Начальник производства Петров С.В.</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись)</div>
        </div>
        
        <!-- Сдал грузоотправитель -->
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Сдал грузоотправитель</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${isReplenishment ? 'Кладовщик Смирнов Алексей Иванович' : escapeText(userPosition) + ' ' + escapeText(userFullName)}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись грузоотправителя)</div>
        </div>
        
        <!-- Товар к перевозке принял (водитель) -->
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Товар к перевозке принял</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Водитель ${escapeText(data.driver || '______________')}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись)</div>
        </div>
        
        <!-- по доверенности -->
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">по доверенности</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${escapeText(data.power_of_attorney || '______________')}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(номер, дата)</div>
        </div>
        
        <!-- Принял грузополучатель -->
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Принял грузополучатель</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${isReplenishment ? (data.completed_by_user ? escapeText(data.completed_by_user.position) + ' ' + escapeText(data.completed_by_user.full_name) : '______________________') : ''}</div>
            </div>
            <div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись грузополучателя)</div>
        </div>
        
        <!-- № пломбы -->
        <div class="field-block" style="margin-bottom: 15px;">
            <div style="display: flex; align-items: baseline;">
                <div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">№ пломбы</div>
                <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">${isReplenishment ? `ПЛ-${String(data.number).slice(-6)}` : ''}</div>
            </div>
        </div>
        
    </div>

    <!-- С товаром переданы документы -->
    <div class="field-block" style="margin: 20px 0;">
        <div style="display: flex; align-items: baseline;">
            <div style="font-size: 14pt; width: 250px; font-weight: bold;">С товаром переданы документы</div>
            <div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Товарно-транспортная накладная  ${escapeText(data.number)}</div>
        </div>
    </div>

</body>
</html>`;
}

/**
 * Генерация DOCX для ТТН-1 (полная копия HTML со всеми таблицами)
 */
async function generateTtn1DocxDocument(data) {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
    
    let totalAmount = 0, totalVat = 0, totalWithVat = 0, totalWeight = 0, totalItems = 0;
    
    data.items.forEach(item => {
        totalAmount += item.amount;
        totalVat += item.vat;
        totalWithVat += item.amount_with_vat;
        totalWeight += item.weight;
        totalItems += item.quantity;
    });
    
    const border = { style: BorderStyle.SINGLE, size: 1 };
    const tableBorder = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
    
    const children = [];
    
    children.push(new Paragraph({
        text: 'ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ  ' + (data.number || '') + ' от ' + (data.date || ''),
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 28,
        spacing: { after: 400 },
        font: "Times New Roman"
    }));
    
    const partiesRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: 'Грузоотправитель', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: 'Грузополучатель', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: 'Заказчик автомобильной перевозки (плательщик)', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
            ]
        }),
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: data.consignor_unp || '', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: data.consignee_unp || '', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: data.consignee_unp || '', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder })
            ]
        })
    ];
    
    const partiesTable = new Table({ rows: partiesRows, width: { size: 70, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER, borders: tableBorder });
    children.push(partiesTable);
    children.push(new Paragraph({ text: 'УНП', bold: true, size: 24, font: "Times New Roman", spacing: { after: 100 } }));
    
    children.push(new Paragraph({
        text: data.date || '',
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 28,
        font: "Times New Roman",
        spacing: { after: 200 }
    }));
    
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Автомобиль',  size: 24, font: "Times New Roman" }),
            new TextRun({ text: ' ' + (data.vehicle || '') + '                                 ', size: 24, font: "Times New Roman", underline: { type: "single" } }),
            new TextRun({ text: 'Прицеп', size: 24, font: "Times New Roman" }),
            new TextRun({ text: '                                  ', size: 24, font: "Times New Roman", underline: { type: "single" } }),
            new TextRun({ text: 'К путевому листу №',  size: 24, font: "Times New Roman" }),
            new TextRun({ text: '                                  ', size: 24, font: "Times New Roman", underline: { type: "single" } })
        ]
    }));
    children.push(new Paragraph({
        children: [
            new TextRun({ text: ' ', size: 18, color: "555555", font: "Times New Roman" }),
            new TextRun({ text: '(марка, регистрационный знак)', size: 18, color: "555555", font: "Times New Roman" }),
            new TextRun({ text: '                         ', size: 18, color: "555555", font: "Times New Roman" }),
            new TextRun({ text: '(марка, регистрационный знак)', size: 18, color: "555555", font: "Times New Roman" }),
            new TextRun({ text: '                         ', size: 18, color: "555555", font: "Times New Roman" })
        ]
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
    
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Водитель', size: 24, font: "Times New Roman" }),
            new TextRun({ text: ' ' + (data.driver || '') + '                                                                        ', size: 24, font: "Times New Roman", underline: { type: "single" } })
        ]
    }));
    children.push(new Paragraph({
        children: [
            new TextRun({ text: ' ', size: 18, color: "555555", font: "Times New Roman" }),
            new TextRun({ text: '(наименование)                                         (фамилия и инициалы)', size: 18, color: "555555", font: "Times New Roman" })
        ]
    }));
    children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
    
    children.push(new Paragraph({ text: 'Заказчик автомобильной перевозки (плательщик)', bold: true, size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: (data.consignee_name || '') + ', ' + (data.consignee_address || ''), size: 24, font: "Times New Roman" }));
    children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: '(наименование, адрес)', size: 18, color: "555555", font: "Times New Roman", spacing: { after: 100 } }));
    
    children.push(new Paragraph({ text: 'Грузоотправитель', bold: true, size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: (data.consignor_name || '') + ', ' + (data.consignor_address || ''), size: 24, font: "Times New Roman" }));
    children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: '(наименование, адрес)', size: 18, color: "555555", font: "Times New Roman", spacing: { after: 100 } }));
    
    children.push(new Paragraph({ text: 'Грузополучатель', bold: true, size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: (data.consignee_name || '') + ', ' + (data.consignee_address || ''), size: 24, font: "Times New Roman" }));
    children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: '(наименование, адрес)', size: 18, color: "555555", font: "Times New Roman", spacing: { after: 100 } }));
    
    const baseRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'Основание отпуска', bold: true, size: 24, font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: 'Договор поставки № ' + (data.contract_number || '') + ' от ' + (data.date || ''), size: 24, font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: 'Пункт погрузки', bold: true, size: 24, font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: data.consignor_address || '', size: 24, font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: 'Пункт разгрузки', bold: true, size: 24, font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: data.destination || '', size: 24, font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } })
        ]
    });
    const baseHintRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '', size: 18, color: "555555", font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: '(дата и номер договора)', size: 18, color: "555555", font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, color: "555555", font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: '(адрес)', size: 18, color: "555555", font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, color: "555555", font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ text: '(адрес)', size: 18, color: "555555", font: "Times New Roman" })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } })
        ]
    });
    children.push(new Table({ rows: [baseRow, baseHintRow], width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
    
    children.push(new Paragraph({ text: 'Переадресовка', bold: true, size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: '(наименование, адрес нового получателя, фамилия, инициалы, подпись уполномоченного должностного лица)', size: 18, color: "555555", font: "Times New Roman", spacing: { after: 100 } }));
    
    children.push(new Paragraph({
        text: 'I. ТОВАРНЫЙ РАЗДЕЛ',
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 28,
        font: "Times New Roman",
        spacing: { after: 200 }
    }));
    
    const goodsRows = [];
    
    goodsRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'Наименование товара', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Единица измерения', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Количество', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Цена, руб. коп.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Стоимость, руб. коп.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Ставка НДС, %', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Сумма НДС, руб. коп.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Стоимость с НДС, руб. коп.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Количество грузовых мест', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Масса груза, кг', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Примечание', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    }));
    
    goodsRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '1', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '2', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '3', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '4', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '5', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '6', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '7', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '8', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '9', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '10', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '11', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    }));
    
    data.items.forEach((item, index) => {
        goodsRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: (item.name || '') + (item.model ? ' ' + item.model : ''), size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: 'шт', alignment: AlignmentType.CENTER, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.quantity.toString(), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.price.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.amount.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '20', alignment: AlignmentType.CENTER, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.vat.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.amount_with_vat.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.quantity.toString(), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: item.weight.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder })
            ]
        }));
    });
    
    goodsRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'ИТОГО', bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalItems.toString(), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalVat.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalWithVat.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalItems.toString(), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalWeight.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder })
        ]
    }));
    
    const goodsTable = new Table({ rows: goodsRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder });
    children.push(goodsTable);
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    
    children.push(new Paragraph({ text: 'Всего сумма НДС: ' + totalVat.toFixed(2) + ' руб.', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'Всего стоимость с НДС: ' + totalWithVat.toFixed(2) + ' руб.', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'Всего масса груза: ' + totalWeight.toFixed(2) + ' кг', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'Всего количество грузовых мест: ' + totalItems + ' (' + numberToWords(totalItems) + ' мест)', size: 24, font: "Times New Roman", spacing: { after: 100 } }));
    
    children.push(new Paragraph({ text: 'Отпуск разрешил: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'Сдал грузоотправитель: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'Товар к перевозке принял: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'по доверенности: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'Принял грузополучатель: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: '№ пломбы: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 50 } }));
    children.push(new Paragraph({ text: 'С товаром переданы документы: ______________________________________', size: 24, font: "Times New Roman" }));
    
    children.push(new Paragraph({
        text: 'II. ПОГРУЗОЧНО-РАЗГРУЗОЧНЫЕ ОПЕРАЦИИ',
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 28,
        font: "Times New Roman",
        spacing: { after: 200 }
    }));
    
    // Первая строка заголовков
    const opHeader1 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'Операция', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Исполнитель', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Способ (ручной, механизированный)', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Код', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Дата, время (ч, мин)', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Дополнительные операции', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Подпись', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Транспортные услуги', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    // Вторая строка заголовков
    const opHeader2 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'Операция', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Исполнитель', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Способ (ручной, механизированный)', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Код', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'прибытия', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'убытия', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'простоя', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'время', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'наименование', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Подпись', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    // Строка с номерами
    const opNumRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '12', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '13', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '14', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '15', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '16', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '17', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '18', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '19', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '20', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    // Пустая строка для заполнения
    const opEmptyRow = new TableRow({
        children: Array(11).fill().map(() => new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }))
    });
    
    children.push(new Table({ rows: [opHeader1, opHeader2, opNumRow, opEmptyRow], width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder }));
    children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
    
    // Транспортные услуги
    children.push(new Paragraph({ text: 'Транспортные услуги: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 100 } }));
    
    children.push(new Paragraph({
        text: 'III. ПРОЧИЕ СВЕДЕНИЯ (заполняется перевозчиком)',
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 28,
        font: "Times New Roman",
        spacing: { after: 200 }
    }));
    
    // Первая строка с объединением колонок
    const infoHeader1 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'Расстояние перевозки по группам дорог, км', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, columnSpan: 5 }),
            new TableCell({ children: [new Paragraph({ text: 'Код экспедирования', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'За транспортные услуги', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Поправочный коэффициент', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, columnSpan: 2 }),
            new TableCell({ children: [new Paragraph({ text: 'Штраф', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    // Вторая строка
    const infoHeader2 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'всего', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'в городе', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'I', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'II', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'III', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'расценки водителю', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'основной тариф', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Штраф', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', bold: true, alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    // Строка с номерами
    const infoNumRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '21', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '22', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '23', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '24', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '25', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '26', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '27', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '28', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '29', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '30', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '31', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    const infoEmptyRow = new TableRow({
        children: Array(11).fill().map(() => new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }))
    });
    
    children.push(new Table({ rows: [infoHeader1, infoHeader2, infoNumRow, infoEmptyRow], width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder }));
    children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
    
    // Отметки о составленных актах
    children.push(new Paragraph({ text: 'Отметки о составленных актах: ______________________________________', size: 24, font: "Times New Roman", spacing: { after: 100 } }));
    
    const calcHeader1 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: 'Расчет стоимости', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'За тонны', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'За расстояние перевозки', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'За специальный транспорт', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'За транспортные услуги', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Погрузочно-разгрузочные работы, т', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Сверхнормативный простой', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, columnSpan: 2 }),
            new TableCell({ children: [new Paragraph({ text: 'Прочие доплаты', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Дополнительные услуги (экспедирование)', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'К оплате', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, columnSpan: 2 }),
            new TableCell({ children: [new Paragraph({ text: 'Таксировка', bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    const calcHeader2 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '', size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '32', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '33', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '34', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '35', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '36', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '37', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '38', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '39', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '40', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '41', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '42', alignment: AlignmentType.CENTER, size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 16, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    const calcRows = [calcHeader1, calcHeader2];
    const calcDataRows = ['По заказу', 'Выполнено', 'Расценка', 'К оплате'];
    calcDataRows.forEach(label => {
        const cells = [new TableCell({ children: [new Paragraph({ text: label, bold: true, size: 22, font: "Times New Roman" })], borders: tableBorder })];
        for (let i = 0; i < 12; i++) {
            cells.push(new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }));
        }
        calcRows.push(new TableRow({ children: cells }));
    });
    
    children.push(new Table({ rows: calcRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder }));
    children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    
    children.push(new Paragraph({ text: 'С товаром переданы документы: ______________________________________', size: 24, font: "Times New Roman" }));
    
    const docx = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman" }
                }
            }
        },
        sections: [{
            properties: {},
            children: children
        }]
    });
    
    return await Packer.toBuffer(docx);
}

// 37. ОБНОВЛЕНИЕ ЗАЯВКИ (ТОЛЬКО МЕНЕДЖЕР)
app.put('/api/shipment-requests/:id', verifyToken, requireManager, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { 
            customer_name, 
            customer_unp,
            customer_address,
            customer_contact,
            customer_phone,
            customer_director,
            required_date, 
            notes, 
            need_vehicle, 
            vehicle_number,
            trailer_number,
            waybill_number_ttn,
            driver_last_name,
            driver_first_name,
            driver_middle_name,
            power_of_attorney,
            buyer_legal_address,
            buyer_bank_account,
            buyer_bank_name,
            buyer_bank_code,
            items
        } = req.body;
        
        console.log('📝 ОБНОВЛЕНИЕ ЗАЯВКИ, получены данные:', {
            customer_name,
            customer_phone,
            customer_director,
            buyer_bank_account,
            buyer_bank_code,
            buyer_bank_name,
            need_vehicle,
            driver_last_name,
            driver_first_name
        });
        
        if (!customer_name) {
            return res.status(400).json({
                success: false,
                message: 'Укажите название организации'
            });
        }
        
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Добавьте хотя бы одну позицию'
            });
        }
        
        // Начинаем транзакцию
        const transaction = dbPool.transaction();
        await transaction.begin();
        
        try {
            // 1. Обновляем основную информацию о заявке
            await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .input('CustomerName', sql.NVarChar, customer_name)
                .input('CustomerContact', sql.NVarChar, customer_contact || null)
                .input('CustomerAddress', sql.NVarChar, customer_address || null)
                .input('CustomerUnp', sql.NVarChar, customer_unp || null)
                .input('CustomerPhone', sql.NVarChar, customer_phone || null)
                .input('CustomerDirector', sql.NVarChar, customer_director || null)
                .input('RequiredDate', sql.Date, required_date || null)
                .input('Notes', sql.NVarChar, notes || null)
                .input('NeedVehicle', sql.Bit, need_vehicle || false)
                .input('VehicleNumber', sql.NVarChar, vehicle_number || null)
                .input('TrailerNumber', sql.NVarChar, trailer_number || null)
                .input('WaybillNumberTTN', sql.NVarChar, waybill_number_ttn || null)
                .input('DriverLastName', sql.NVarChar, driver_last_name || null)
                .input('DriverFirstName', sql.NVarChar, driver_first_name || null)
                .input('DriverMiddleName', sql.NVarChar, driver_middle_name || null)
                .input('PowerOfAttorney', sql.NVarChar, power_of_attorney || null)
                .query(`
                    UPDATE tbl_ShipmentRequests 
                    SET 
                        customer_name = @CustomerName,
                        customer_contact = @CustomerContact,
                        customer_address = @CustomerAddress,
                        customer_unp = @CustomerUnp,
                        customer_phone = @CustomerPhone,
                        customer_director = @CustomerDirector,
                        required_date = @RequiredDate,
                        notes = @Notes,
                        need_vehicle = @NeedVehicle,
                        vehicle_number = @VehicleNumber,
                        trailer_number = @TrailerNumber,
                        waybill_number_ttn = @WaybillNumberTTN,
                        driver_last_name = @DriverLastName,
                        driver_first_name = @DriverFirstName,
                        driver_middle_name = @DriverMiddleName,
                        power_of_attorney = @PowerOfAttorney
                    WHERE id = @RequestId AND status = 'new'
                `);
            
            // 2. Обновляем позиции заявки (удаляем старые и вставляем новые)
            await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .query('DELETE FROM tbl_ShipmentRequestItems WHERE request_id = @RequestId');
            
            // Вставляем новые позиции
            for (const item of items) {
                await transaction.request()
                    .input('RequestId', sql.Int, requestId)
                    .input('DeviceId', sql.Int, item.deviceId)
                    .input('Quantity', sql.Int, item.quantity)
                    .input('Price', sql.Decimal(18,2), item.price)
                    .query(`
                        INSERT INTO tbl_ShipmentRequestItems (request_id, device_id, quantity_requested, price_per_unit, status)
                        VALUES (@RequestId, @DeviceId, @Quantity, @Price, 'pending')
                    `);
            }
            
            // 3. Обновляем реквизиты в договоре
            const totalAmountResult = await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .query(`
                    SELECT ISNULL(SUM(quantity_requested * price_per_unit), 0) as total_amount
                    FROM tbl_ShipmentRequestItems
                    WHERE request_id = @RequestId
                `);
            
            const totalAmount = totalAmountResult.recordset[0].total_amount;
            
            // Обновляем contract_data
            const contractNumberResult = await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .query(`
                    SELECT contract_number FROM tbl_ShipmentRequests WHERE id = @RequestId
                `);
            
            const contractNumber = contractNumberResult.recordset[0]?.contract_number || '';
            
            // Формируем обновленные данные договора
            const contractData = JSON.stringify({
                number: contractNumber,
                date: new Date().toLocaleDateString('ru-RU'),
                request_number: `OTG-${new Date().getFullYear()}-${String(requestId).padStart(4, '0')}`,
                customer_name: customer_name,
                customer_unp: customer_unp || '',
                customer_address: customer_address || '',
                customer_phone: customer_phone || '',
                customer_director: customer_director || '',
                total_amount: totalAmount
            });
            
            // Проверяем, существует ли договор
            const contractExists = await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .query('SELECT id FROM tbl_Contracts WHERE request_id = @RequestId');
            
            if (contractExists.recordset.length > 0) {
                // Обновляем существующий договор
                await transaction.request()
                    .input('RequestId', sql.Int, requestId)
                    .input('ContractData', sql.NVarChar, contractData)
                    .input('BuyerLegalAddress', sql.NVarChar, buyer_legal_address || customer_address || null)
                    .input('BuyerBankAccount', sql.NVarChar, buyer_bank_account || null)
                    .input('BuyerBankName', sql.NVarChar, buyer_bank_name || null)
                    .input('BuyerBankCode', sql.NVarChar, buyer_bank_code || null)
                    .query(`
                        UPDATE tbl_Contracts 
                        SET 
                            contract_data = @ContractData,
                            buyer_legal_address = @BuyerLegalAddress,
                            buyer_bank_account = @BuyerBankAccount,
                            buyer_bank_name = @BuyerBankName,
                            buyer_bank_code = @BuyerBankCode
                        WHERE request_id = @RequestId
                    `);
            } else {
                // Создаем новый договор
                const newContractNumber = await transaction.request()
                    .query("SELECT dbo.fn_GenerateContractNumber() as contract_number");
                
                const newContractNum = newContractNumber.recordset[0].contract_number;
                
                await transaction.request()
                    .input('ContractNumber', sql.NVarChar, newContractNum)
                    .input('RequestId', sql.Int, requestId)
                    .input('ContractData', sql.NVarChar, contractData)
                    .input('CreatedBy', sql.Int, req.user.id)
                    .input('BuyerLegalAddress', sql.NVarChar, buyer_legal_address || customer_address || null)
                    .input('BuyerBankAccount', sql.NVarChar, buyer_bank_account || null)
                    .input('BuyerBankName', sql.NVarChar, buyer_bank_name || null)
                    .input('BuyerBankCode', sql.NVarChar, buyer_bank_code || null)
                    .query(`
                        INSERT INTO tbl_Contracts (
                            contract_number, request_id, contract_data, created_by, created_at, status,
                            seller_legal_address, seller_bank_account, seller_bank_name, seller_bank_code,
                            buyer_legal_address, buyer_bank_account, buyer_bank_name, buyer_bank_code
                        )
                        VALUES (
                            @ContractNumber, @RequestId, @ContractData, @CreatedBy, GETDATE(), 'active',
                            '220012, г. Минск, ул. Гикало, д. 5', 'BY13BELA30120000000000000000', 'ОАО "АСБ Беларусбанк"', 'BAPBBY2X',
                            @BuyerLegalAddress, @BuyerBankAccount, @BuyerBankName, @BuyerBankCode
                        )
                    `);
                
                // Обновляем номер договора в заявке
                await transaction.request()
                    .input('RequestId', sql.Int, requestId)
                    .input('ContractNumber', sql.NVarChar, newContractNum)
                    .query(`
                        UPDATE tbl_ShipmentRequests 
                        SET contract_number = @ContractNumber 
                        WHERE id = @RequestId
                    `);
            }
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: 'Заявка успешно обновлена'
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('Ошибка обновления заявки:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка обновления заявки'
        });
    }
});

// 38. УДАЛЕНИЕ ЗАЯВКИ (менеджер может удалять только новые невзятые заявки)
app.delete('/api/shipment-requests/:id', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        // Получаем информацию о заявке
        const checkResult = await dbPool.request()
            .input('RequestId', sql.Int, requestId)
            .query(`
                SELECT status, created_by, assigned_to 
                FROM tbl_ShipmentRequests 
                WHERE id = @RequestId
            `);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        const request = checkResult.recordset[0];
        
        // Проверка прав на удаление
        let canDelete = false;
        
        if (req.user.role === 'admin') {
            canDelete = true; // Админ может удалить любую
        } 
        else if (req.user.role === 'manager') {
            // Менеджер может удалить только свои НОВЫЕ (не взятые в работу) заявки
            if (request.created_by === req.user.id && request.status === 'new' && !request.assigned_to) {
                canDelete = true;
            }
        }
        
        if (!canDelete) {
            return res.status(403).json({
                success: false,
                message: 'У вас нет прав на удаление этой заявки. Менеджер может удалять только свои новые (не взятые в работу) заявки.'
            });
        }
        
        // Проверяем, есть ли отгрузки по заявке
        const itemsResult = await dbPool.request()
            .input('request_id', sql.Int, requestId)
            .query(`
                SELECT SUM(quantity_shipped) as shipped
                FROM tbl_ShipmentRequestItems
                WHERE request_id = @request_id
            `);
        
        if (itemsResult.recordset[0].shipped > 0) {
            return res.status(400).json({
                success: false,
                message: 'Нельзя удалить сведения о заявке, по которой уже были отгрузки'
            });
        }
        
        // Удаляем связанные данные
        const transaction = dbPool.transaction();
        await transaction.begin();
        
        try {
            await transaction.request()
                .input('request_id', sql.Int, requestId)
                .query('DELETE FROM tbl_Contracts WHERE request_id = @request_id');
            
            await transaction.request()
                .input('request_id', sql.Int, requestId)
                .query('DELETE FROM tbl_ShipmentRequestItems WHERE request_id = @request_id');
            
            await transaction.request()
                .input('id', sql.Int, requestId)
                .query('DELETE FROM tbl_ShipmentRequests WHERE id = @id');
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: 'Заявка успешно удалена'
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('Ошибка удаления заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления заявки: ' + error.message
        });
    }
});

// 39. СТАТИСТИКА ДЛЯ ДАШБОРДА
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .execute('sp_GetDashboardStats');
        
        const stats = {
            devices: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0] : { total_devices: 0, active_devices: 0, archived_devices: 0 },
            stock: result.recordsets[1] && result.recordsets[1].length > 0 ? result.recordsets[1][0] : { total_in_stock: 0, total_quantity: 0, needing_restock: 0 },
            replenishment: result.recordsets[2] && result.recordsets[2].length > 0 ? result.recordsets[2][0] : { total: 0, pending: 0, approved: 0, completed: 0, rejected: 0 },
            shipment: result.recordsets[3] && result.recordsets[3].length > 0 ? result.recordsets[3][0] : { total: 0, new: 0, processing: 0, partial: 0, shipped: 0, completed: 0, cancelled: 0 },
            user_role: req.user.role
        };
        
        const deviceStatsResult = await dbPool.request()
            .execute('sp_GetDeviceStats');
        
        const deviceStats = {
            total: deviceStatsResult.recordsets[0] && deviceStatsResult.recordsets[0].length > 0 ? deviceStatsResult.recordsets[0][0]?.total || 0 : 0,
            in_stock: deviceStatsResult.recordsets[0] && deviceStatsResult.recordsets[0].length > 0 ? deviceStatsResult.recordsets[0][0]?.in_stock || 0 : 0,
            low_stock: deviceStatsResult.recordsets[0] && deviceStatsResult.recordsets[0].length > 0 ? deviceStatsResult.recordsets[0][0]?.low_stock || 0 : 0,
            out_of_stock: deviceStatsResult.recordsets[0] && deviceStatsResult.recordsets[0].length > 0 ? deviceStatsResult.recordsets[0][0]?.out_of_stock || 0 : 0,
            total_quantity: deviceStatsResult.recordsets[0] && deviceStatsResult.recordsets[0].length > 0 ? deviceStatsResult.recordsets[0][0]?.total_quantity || 0 : 0,
            needs_restock: deviceStatsResult.recordsets[0] && deviceStatsResult.recordsets[0].length > 0 ? deviceStatsResult.recordsets[0][0]?.needs_restock || 0 : 0,
            categories: deviceStatsResult.recordsets[1] || [],
            recent_movements: deviceStatsResult.recordsets[2] || []
        };
        
        res.json({
            success: true,
            stats: {
                ...stats,
                devices: deviceStats
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статистики'
        });
    }
});

// 40. СТАТИСТИКА ПРИБОРОВ
app.get('/api/devices/stats', verifyToken, async (req, res) => {
    console.log('='.repeat(50));
    console.log('📊 ЗАПРОС СТАТИСТИКИ');
    console.log('='.repeat(50));
    
    try {
        if (!dbPool) {
            console.error('❌ Нет подключения к БД');
            return res.status(500).json({
                success: false,
                message: 'Нет подключения к базе данных'
            });
        }
        
        const result = await dbPool.request()
            .execute('sp_GetDeviceStats');
        
        const stats = {
            total: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0]?.total || 0 : 0,
            in_stock: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0]?.in_stock || 0 : 0,
            low_stock: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0]?.low_stock || 0 : 0,
            out_of_stock: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0]?.out_of_stock || 0 : 0,
            total_quantity: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0]?.total_quantity || 0 : 0,
            needs_restock: result.recordsets[0] && result.recordsets[0].length > 0 ? result.recordsets[0][0]?.needs_restock || 0 : 0,
            categories: result.recordsets[1] || [],
            recent_movements: result.recordsets[2] || []
        };
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ ОШИБКА ПОЛУЧЕНИЯ СТАТИСТИКИ:', error);
        res.json({
            success: true,
            stats: {
                total: 0,
                in_stock: 0,
                low_stock: 0,
                out_of_stock: 0,
                total_quantity: 0,
                needs_restock: 0,
                categories: [],
                recent_movements: []
            }
        });
    }
});

// 41. ОТЧЕТ ПО СОСТОЯНИЮ СКЛАДА
app.get('/api/reports/stock-status', verifyToken, async (req, res) => {
    try {
        const { category, status } = req.query;
        
        const result = await dbPool.request()
            .input('Category', sql.NVarChar, category === 'all' ? null : category)
            .input('Status', sql.NVarChar, status === 'all' ? null : status)
            .execute('sp_GetStockReport');
        
        res.json({
            success: true,
            data: result.recordset
        });
        
    } catch (error) {
        console.error('Ошибка получения отчета по складу:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения отчета'
        });
    }
});

// 42. ОТЧЕТ ПО ЗАКАЗАМ (сегодня/завтра)
app.get('/api/reports/orders', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .execute('sp_GetOrdersReport');
        
        res.json({
            success: true,
            today_orders: result.recordsets[0] || [],
            tomorrow_shipments: result.recordsets[1] || [],
            summary: result.recordsets[2] && result.recordsets[2].length > 0 ? result.recordsets[2][0] : {
                today_orders_count: 0, today_total_quantity: 0, today_total_amount: 0,
                tomorrow_orders_count: 0, tomorrow_total_quantity: 0, tomorrow_total_amount: 0
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения отчета по заказам:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения отчета'
        });
    }
});

// 43. ОТЧЕТ ПО ПРОДАЖАМ ЗА ПЕРИОД
app.get('/api/reports/sales', verifyToken, async (req, res) => {
    try {
        const { start_date, end_date, group_by = 'day' } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Укажите начальную и конечную дату'
            });
        }
        
        const result = await dbPool.request()
            .input('StartDate', sql.Date, start_date)
            .input('EndDate', sql.Date, end_date)
            .input('GroupBy', sql.NVarChar, group_by)
            .execute('sp_GetSalesReport');
        
        res.json({
            success: true,
            details: result.recordsets[0] || [],
            timeline: result.recordsets[1] || [],
            total: result.recordsets[2] && result.recordsets[2].length > 0 ? result.recordsets[2][0] : { total_orders: 0, total_quantity: 0, total_amount: 0 }
        });
        
    } catch (error) {
        console.error('Ошибка получения отчета по продажам:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения отчета'
        });
    }
});

// 44. ЭКСПОРТ ОТЧЕТОВ
app.get('/api/reports/export', verifyToken, async (req, res) => {
    try {
        const { type, format, category, status, start_date, end_date } = req.query;
        
        let data = [];
        let reportTitle = '';
        let filename = '';
        
        if (type === 'stock') {
            const result = await dbPool.request()
                .input('Category', sql.NVarChar, category === 'all' ? null : category)
                .input('Status', sql.NVarChar, status === 'all' ? null : status)
                .execute('sp_GetStockReport');
            data = result.recordset;
            reportTitle = 'Отчет по состоянию склада';
            filename = 'stock_report';
            
        } else if (type === 'sales' && start_date && end_date) {
            const result = await dbPool.request()
                .input('StartDate', sql.Date, start_date)
                .input('EndDate', sql.Date, end_date)
                .execute('sp_GetSalesReport');
            data = result.recordsets[0] || [];
            reportTitle = `Отчет по продажам за период ${start_date} - ${end_date}`;
            filename = `sales_report_${start_date}_${end_date}`;
        }
        
        const safeFileName = filename.replace(/[^a-zA-Z0-9\-]/g, '_');
        
        if (format === 'excel') {
            const workbook = XLSX.utils.book_new();
            
            let worksheet_data = [[reportTitle], []];
            
            if (type === 'stock') {
                worksheet_data.push(['ID', 'Наименование', 'Категория', 'Производитель', 'Модель', 'Цена', 'Количество', 'Мин. запас', 'Статус', 'Местоположение', 'Нехватка']);
                data.forEach(item => {
                    worksheet_data.push([
                        item.unique_id,
                        item.name,
                        item.category || '-',
                        item.manufacturer || '-',
                        item.model || '-',
                        item.price,
                        item.quantity,
                        item.min_quantity,
                        item.stock_status,
                        item.location ? `${item.location} ${item.shelf || ''}` : '-',
                        item.shortage > 0 ? item.shortage : 0
                    ]);
                });
            } else if (type === 'sales') {
                worksheet_data.push(['Номер заявки', 'Клиент', 'Дата', 'Количество позиций', 'Всего товаров', 'Сумма']);
                data.forEach(item => {
                    worksheet_data.push([
                        item.request_number,
                        item.customer_name,
                        new Date(item.date).toLocaleDateString(),
                        item.items_count,
                        item.total_quantity,
                        item.total_amount
                    ]);
                });
            }
            
            const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
            
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
            res.send(excelBuffer);
            
        } else if (format === 'docx') {
            try {
                const children = [
                    new Paragraph({
                        text: reportTitle,
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    })
                ];
                
                if (type === 'stock') {
                    const tableRows = [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('ID')] }),
                                new TableCell({ children: [new Paragraph('Наименование')] }),
                                new TableCell({ children: [new Paragraph('Категория')] }),
                                new TableCell({ children: [new Paragraph('Кол-во')] }),
                                new TableCell({ children: [new Paragraph('Мин. запас')] }),
                                new TableCell({ children: [new Paragraph('Статус')] }),
                                new TableCell({ children: [new Paragraph('Местоположение')] })
                            ]
                        })
                    ];
                    
                    data.forEach(item => {
                        tableRows.push(
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph(item.unique_id)] }),
                                    new TableCell({ children: [new Paragraph(item.name)] }),
                                    new TableCell({ children: [new Paragraph(item.category || '-')] }),
                                    new TableCell({ children: [new Paragraph(item.quantity.toString())] }),
                                    new TableCell({ children: [new Paragraph(item.min_quantity.toString())] }),
                                    new TableCell({ children: [new Paragraph(item.stock_status)] }),
                                    new TableCell({ children: [new Paragraph(item.location || '-')] })
                                ]
                            })
                        );
                    });
                    
                    const table = new Table({ rows: tableRows });
                    children.push(table);
                    
                } else if (type === 'sales') {
                    const tableRows = [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph('Номер заявки')] }),
                                new TableCell({ children: [new Paragraph('Клиент')] }),
                                new TableCell({ children: [new Paragraph('Дата')] }),
                                new TableCell({ children: [new Paragraph('Сумма')] })
                            ]
                        })
                    ];
                    
                    data.forEach(item => {
                        tableRows.push(
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph(item.request_number)] }),
                                    new TableCell({ children: [new Paragraph(item.customer_name)] }),
                                    new TableCell({ children: [new Paragraph(new Date(item.date).toLocaleDateString())] }),
                                    new TableCell({ children: [new Paragraph(item.total_amount + ' руб.')] })
                                ]
                            })
                        );
                    });
                    
                    const table = new Table({ rows: tableRows });
                    children.push(table);
                }
                
                const docx = new Document({
                    sections: [{
                        properties: {},
                        children: children
                    }]
                });
                
                const buffer = await Packer.toBuffer(docx);
                
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
                res.send(buffer);
            } catch (docxError) {
                console.error('Ошибка генерации DOCX:', docxError);
                return res.status(500).json({
                    success: false,
                    message: 'Ошибка генерации DOCX: ' + docxError.message
                });
            }
        }
        
    } catch (error) {
        console.error('Ошибка экспорта отчета:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта отчета: ' + error.message
        });
    }
});


// 45. ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ ПРАЙС-ЛИСТА
app.get('/api/price-list-data', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .execute('sp_GetPriceList');
        
        res.json({
            success: true,
            devices: result.recordset
        });
        
    } catch (error) {
        console.error('Ошибка получения данных прайс-листа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения данных прайс-листа'
        });
    }
});

// 46. ЭКСПОРТ ПРАЙС-ЛИСТА
app.get('/api/price-list', verifyToken, async (req, res) => {
    try {
        const format = req.query.format || 'excel';
        
        const result = await dbPool.request()
            .execute('sp_GetPriceList');
        
        const devices = result.recordset;
        const safeFileName = `price_list_${new Date().toISOString().split('T')[0]}`;
        
        if (format === 'excel') {
            const workbook = XLSX.utils.book_new();
            
            const worksheet_data = [
                ['ПРАЙС-ЛИСТ ООО "Атомтех"'],
                [`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`],
                [],
                ['ID', 'Наименование', 'Категория', 'Производитель', 'Модель', 'Цена (руб.)']
            ];
            
            devices.forEach(item => {
                worksheet_data.push([
                    item.unique_id,
                    item.name,
                    item.category || '-',
                    item.manufacturer || '-',
                    item.model || '-',
                    item.price
                ]);
            });
            
            const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Прайс-лист');
            
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
            res.send(excelBuffer);
            
        } else if (format === 'docx') {
            try {
                const children = [
                    new Paragraph({
                        text: 'ПРАЙС-ЛИСТ ООО "Атомтех"',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        text: `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    })
                ];
                
                const tableRows = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('ID')] }),
                            new TableCell({ children: [new Paragraph('Наименование')] }),
                            new TableCell({ children: [new Paragraph('Категория')] }),
                            new TableCell({ children: [new Paragraph('Производитель')] }),
                            new TableCell({ children: [new Paragraph('Модель')] }),
                            new TableCell({ children: [new Paragraph('Цена')] })
                        ]
                    })
                ];
                
                devices.forEach(item => {
                    tableRows.push(
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(item.unique_id)] }),
                                new TableCell({ children: [new Paragraph(item.name)] }),
                                new TableCell({ children: [new Paragraph(item.category || '-')] }),
                                new TableCell({ children: [new Paragraph(item.manufacturer || '-')] }),
                                new TableCell({ children: [new Paragraph(item.model || '-')] }),
                                new TableCell({ children: [new Paragraph(item.price + ' руб.')] })
                            ]
                        })
                    );
                });
                
                const table = new Table({ rows: tableRows });
                children.push(table);
                
                const docx = new Document({
                    sections: [{
                        properties: {},
                        children: children
                    }]
                });
                
                const buffer = await Packer.toBuffer(docx);
                
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
                res.send(buffer);
            } catch (docxError) {
                console.error('Ошибка генерации DOCX:', docxError);
                return res.status(500).json({
                    success: false,
                    message: 'Ошибка генерации DOCX: ' + docxError.message
                });
            }
        }
        
    } catch (error) {
        console.error('Ошибка генерации прайс-листа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка генерации прайс-листа'
        });
    }
});


// 47. СОЗДАНИЕ ИНВЕНТАРИЗАЦИИ
app.post('/api/inventory', verifyToken, async (req, res) => {
    try {
        const { 
            inventoryDate, 
            orderNumber, 
            orderDate,
            commissionChairman,
            commissionMembers,
            inventoryStartDate,
            inventoryEndDate,
            responsiblePerson,
            notes 
        } = req.body;
        
        if (!inventoryDate) {
            return res.status(400).json({
                success: false,
                message: 'Укажите дату инвентаризации'
            });
        }
        
        // Преобразуем членов комиссии в JSON
        let commissionMembersJson = null;
        if (commissionMembers && Array.isArray(commissionMembers) && commissionMembers.length > 0) {
            commissionMembersJson = JSON.stringify(commissionMembers);
        }
        
        const result = await dbPool.request()
            .input('InventoryDate', sql.Date, inventoryDate)
            .input('OrderNumber', sql.NVarChar, orderNumber || null)
            .input('OrderDate', sql.Date, orderDate || null)
            .input('CommissionChairman', sql.NVarChar, commissionChairman || null)
            .input('CommissionMembers', sql.NVarChar, commissionMembersJson)
            .input('InventoryStartDate', sql.Date, inventoryStartDate || null)
            .input('InventoryEndDate', sql.Date, inventoryEndDate || null)
            .input('ResponsiblePerson', sql.NVarChar, responsiblePerson || null)
            .input('Notes', sql.NVarChar, notes || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .execute('sp_CreateInventory');
        
        const invResult = result.recordset[0];
        
        res.status(201).json({
            success: invResult.Success === 1,
            inventoryId: invResult.InventoryId,
            inventoryNumber: invResult.InventoryNumber,
            message: invResult.Message
        });
        
    } catch (error) {
        console.error('❌ Ошибка создания инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания инвентаризации: ' + error.message
        });
    }
});

// 48. ПОЛУЧЕНИЕ СПИСКА ИНВЕНТАРИЗАЦИЙ
app.get('/api/inventory', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .execute('sp_GetInventories');
        
        res.json({
            success: true,
            inventories: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения инвентаризаций:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения инвентаризаций'
        });
    }
});

// 49. ПОЛУЧЕНИЕ ДЕТАЛЕЙ ИНВЕНТАРИЗАЦИИ
app.get('/api/inventory/:id', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('InventoryId', sql.Int, req.params.id)
            .execute('sp_GetInventoryDetails');
        
        if (result.recordsets[0].length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Инвентаризация не найдена'
            });
        }
        
        res.json({
            success: true,
            inventory: result.recordsets[0][0],
            items: result.recordsets[1]
        });
    } catch (error) {
        console.error('Ошибка получения деталей инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения деталей инвентаризации'
        });
    }
});

// 50. ОБНОВЛЕНИЕ ФАКТИЧЕСКОГО КОЛИЧЕСТВА
app.put('/api/inventory/items/:itemId', verifyToken, async (req, res) => {
    try {
        const { actualQuantity, notes } = req.body;
        
        const result = await dbPool.request()
            .input('ItemId', sql.Int, req.params.itemId)
            .input('ActualQuantity', sql.Int, actualQuantity)
            .input('Notes', sql.NVarChar, notes || null)
            .execute('sp_UpdateInventoryItem');
        
        const itemResult = result.recordset[0];
        
        res.json({
            success: itemResult.Success === 1,
            message: itemResult.Message
        });
    } catch (error) {
        console.error('Ошибка обновления элемента инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления'
        });
    }
});

// 51. ЗАВЕРШЕНИЕ ИНВЕНТАРИЗАЦИИ (НЕ МЕНЯЕТ СКЛАД, НЕ СОЗДАЕТ ЗАЯВКИ)
app.post('/api/inventory/:id/complete', verifyToken, async (req, res) => {
    try {
        const inventoryId = req.params.id;
        
        const result = await dbPool.request()
            .input('InventoryId', sql.Int, inventoryId)
            .input('CompletedBy', sql.Int, req.user.id)
            .execute('sp_CompleteInventory');
        
        const invResult = result.recordset[0];
        
        if (invResult.Success === 0) {
            return res.status(400).json({
                success: false,
                message: invResult.Message
            });
        }
        
        if (invResult.DiscrepanciesCount > 0) {
            const discrepanciesResult = await dbPool.request()
                .input('InventoryId', sql.Int, inventoryId)
                .execute('sp_GetInventoryDiscrepancies');
            
            res.json({
                success: true,
                message: invResult.Message,
                hasDiscrepancies: true,
                discrepanciesCount: invResult.DiscrepanciesCount,
                surplusCount: invResult.SurplusCount,
                shortageCount: invResult.ShortageCount,
                discrepancies: discrepanciesResult.recordset
            });
        } else {
            res.json({
                success: true,
                message: invResult.Message,
                hasDiscrepancies: false
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка завершения инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка завершения инвентаризации: ' + error.message
        });
    }
});

// 52. УДАЛЕНИЕ ИНВЕНТАРИЗАЦИИ
app.delete('/api/inventory/:id', verifyToken, async (req, res) => {
    try {
        const inventoryId = req.params.id;
        
        const result = await dbPool.request()
            .input('InventoryId', sql.Int, inventoryId)
            .execute('sp_DeleteInventory');
        
        const invResult = result.recordset[0];
        
        res.json({
            success: invResult.Success === 1,
            message: invResult.Message
        });
        
    } catch (error) {
        console.error('Ошибка удаления инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления инвентаризации: ' + error.message
        });
    }
});
// Обновление статуса инвентаризации
app.put('/api/inventory/:id/status', verifyToken, async (req, res) => {
    try {
        const inventoryId = req.params.id;
        const { status } = req.body;
        
        // Проверяем допустимые статусы
        const validStatuses = ['draft', 'in_progress', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Недопустимый статус'
            });
        }
        
        // Обновляем статус
        const result = await dbPool.request()
            .input('InventoryId', sql.Int, inventoryId)
            .input('Status', sql.NVarChar, status)
            .query(`
                UPDATE tbl_Inventory 
                SET status = @Status
                WHERE id = @InventoryId
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Инвентаризация не найдена'
            });
        }
        
        res.json({
            success: true,
            message: `Статус изменен на ${status === 'in_progress' ? 'В процессе' : status}`
        });
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления статуса'
        });
    }
});
// 53. ЭКСПОРТ ИНВЕНТАРИЗАЦИИ
app.get('/api/inventory/:id/export', verifyToken, async (req, res) => {
    try {
        const inventoryId = req.params.id;
        const format = req.query.format || 'excel';
        
        const invResult = await dbPool.request()
            .input('id', sql.Int, inventoryId)
            .query(`
                SELECT 
                    i.*,
                    u1.full_name as created_by_name,
                    u2.full_name as completed_by_name
                FROM tbl_Inventory i
                LEFT JOIN tbl_Users u1 ON i.created_by = u1.id
                LEFT JOIN tbl_Users u2 ON i.completed_by = u2.id
                WHERE i.id = @id
            `);
        
        if (invResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Инвентаризация не найдена'
            });
        }
        
        const inventory = invResult.recordset[0];
        
        const itemsResult = await dbPool.request()
            .input('inventory_id', sql.Int, inventoryId)
            .query(`
                SELECT ii.*, d.unique_id, d.name, d.category
                FROM tbl_InventoryItems ii
                JOIN tbl_Devices d ON ii.device_id = d.id
                WHERE ii.inventory_id = @inventory_id
                ORDER BY d.name
            `);
        
        const items = itemsResult.recordset;
        
        const safeFileName = `inventory_${inventory.inventory_number}_${new Date().toISOString().split('T')[0]}`.replace(/[^a-zA-Z0-9\-]/g, '_');
        
        if (format === 'excel') {
            const workbook = XLSX.utils.book_new();
            
            const worksheet_data = [
                [`ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ № ${inventory.inventory_number}`],
                [`Дата: ${new Date(inventory.inventory_date).toLocaleDateString('ru-RU')}`],
                [`Статус: ${inventory.status === 'completed' ? 'Завершена' : inventory.status === 'in_progress' ? 'В процессе' : 'Черновик'}`],
                [`Создал: ${inventory.created_by_name || '-'}`],
                ...(inventory.completed_by_name ? [[`Завершил: ${inventory.completed_by_name}`]] : []),
                ...(inventory.completed_at ? [[`Дата завершения: ${new Date(inventory.completed_at).toLocaleString('ru-RU')}`]] : []),
                ...(inventory.notes ? [[`Примечания: ${inventory.notes}`]] : []),
                [],
                ['№', 'ID прибора', 'Наименование', 'Категория', 'По учету', 'Фактически', 'Разница', 'Примечания']
            ];
            
            const flatData = [];
            worksheet_data.forEach(row => {
                if (Array.isArray(row) && row.length > 0) {
                    flatData.push(row);
                }
            });
            
            items.forEach((item, index) => {
                flatData.push([
                    index + 1,
                    item.unique_id,
                    item.name,
                    item.category || '-',
                    item.book_quantity,
                    item.actual_quantity,
                    item.difference,
                    item.notes || ''
                ]);
            });
            
            const totalDiscrepancies = items.filter(i => i.difference !== 0).length;
            flatData.push([]);
            flatData.push(['Итого расхождений:', totalDiscrepancies]);
            
            const worksheet = XLSX.utils.aoa_to_sheet(flatData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Инвентаризация');
            
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
            return res.send(excelBuffer);
            
        } else if (format === 'docx') {
            try {
                const children = [];
                
                children.push(
                    new Paragraph({
                        text: 'ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    })
                );
                
                children.push(
                    new Paragraph({
                        text: `№ ${inventory.inventory_number}`,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    })
                );
                
                children.push(new Paragraph(`Дата: ${new Date(inventory.inventory_date).toLocaleDateString('ru-RU')}`));
                children.push(new Paragraph(`Статус: ${inventory.status === 'completed' ? 'Завершена' : inventory.status === 'in_progress' ? 'В процессе' : 'Черновик'}`));
                children.push(new Paragraph(`Создал: ${inventory.created_by_name || '-'}`));
                if (inventory.completed_by_name) {
                    children.push(new Paragraph(`Завершил: ${inventory.completed_by_name}`));
                }
                if (inventory.completed_at) {
                    children.push(new Paragraph(`Дата завершения: ${new Date(inventory.completed_at).toLocaleString('ru-RU')}`));
                }
                if (inventory.notes) {
                    children.push(new Paragraph(`Примечания: ${inventory.notes}`));
                }
                children.push(new Paragraph(''));
                
                const tableRows = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph('№')] }),
                            new TableCell({ children: [new Paragraph('ID')] }),
                            new TableCell({ children: [new Paragraph('Наименование')] }),
                            new TableCell({ children: [new Paragraph('Категория')] }),
                            new TableCell({ children: [new Paragraph('По учету')] }),
                            new TableCell({ children: [new Paragraph('Фактически')] }),
                            new TableCell({ children: [new Paragraph('Разница')] }),
                            new TableCell({ children: [new Paragraph('Примечания')] })
                        ]
                    })
                ];
                
                items.forEach((item, index) => {
                    tableRows.push(
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph((index + 1).toString())] }),
                                new TableCell({ children: [new Paragraph(item.unique_id)] }),
                                new TableCell({ children: [new Paragraph(item.name)] }),
                                new TableCell({ children: [new Paragraph(item.category || '-')] }),
                                new TableCell({ children: [new Paragraph(item.book_quantity.toString())] }),
                                new TableCell({ children: [new Paragraph(item.actual_quantity.toString())] }),
                                new TableCell({ children: [new Paragraph(item.difference.toString())] }),
                                new TableCell({ children: [new Paragraph(item.notes || '')] })
                            ]
                        })
                    );
                });
                
                const table = new Table({ rows: tableRows });
                children.push(table);
                
                children.push(new Paragraph(''));
                const totalDiscrepancies = items.filter(i => i.difference !== 0).length;
                children.push(new Paragraph({ text: `Итого расхождений: ${totalDiscrepancies}`, bold: true }));
                
                const docx = new Document({
                    sections: [{
                        properties: {},
                        children: children
                    }]
                });
                
                const buffer = await Packer.toBuffer(docx);
                
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
                return res.send(buffer);
            } catch (docxError) {
                console.error('Ошибка генерации DOCX:', docxError);
                return res.status(500).json({
                    success: false,
                    message: 'Ошибка генерации DOCX: ' + docxError.message
                });
            }
        }
        
    } catch (error) {
        console.error('Ошибка экспорта инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта инвентаризации: ' + error.message
        });
    }
});

// Эндпоинт для экспорта документов инвентаризации
app.get('/api/inventory/:id/export-document', verifyToken, async (req, res) => {
    try {
        const inventoryId = req.params.id;
        const docType = req.query.type || 'inventory_list';
        const format = req.query.format || 'html';
        
        console.log(`📄 Экспорт документа: inventoryId=${inventoryId}, type=${docType}, format=${format}`);
        
        // Получаем данные для экспорта
        const result = await dbPool.request()
            .input('InventoryId', sql.Int, inventoryId)
            .execute('sp_GetInventoryForExport');
        
        if (result.recordsets[0].length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Инвентаризация не найдена'
            });
        }
        
        const inventory = result.recordsets[0][0];
        let items = result.recordsets[1] || [];
        
        // Парсим членов комиссии из JSON
        let commissionMembersList = [];
        if (inventory.commission_members) {
            try {
                commissionMembersList = JSON.parse(inventory.commission_members);
            } catch(e) {
                commissionMembersList = [];
            }
        }
        
        const documentData = {
            ...inventory,
            commission_members: commissionMembersList,
            items: items
        };
        
        const safeFileName = `inventory_${inventory.inventory_number}_${docType}`.replace(/[^a-zA-Z0-9\-]/g, '_');
        
        if (docType === 'inventory_list') {
            if (format === 'html') {
                const html = generateInventoryListHtml(documentData);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
                res.send(html);
            } else if (format === 'excel') {
                const excelBuffer = await generateInventoryListExcel(documentData);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
                res.send(excelBuffer);
            } else if (format === 'docx') {
                const docxBuffer = await generateInventoryListDocx(documentData);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
                res.send(docxBuffer);
            } else {
                res.status(400).json({ success: false, message: 'Неподдерживаемый формат' });
            }
        } else if (docType === 'comparison_sheet') {
            // Фильтруем только расхождения
            const discrepancies = items.filter(i => (i.difference || 0) !== 0);
            
            if (discrepancies.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Нет расхождений для формирования сличительной ведомости'
                });
            }
            
            const comparisonData = { ...documentData, items: discrepancies };
            
            if (format === 'html') {
                const html = generateComparisonSheetHtml(comparisonData);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
                res.send(html);
            } else if (format === 'excel') {
                const excelBuffer = await generateComparisonSheetExcel(comparisonData);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
                res.send(excelBuffer);
            } else if (format === 'docx') {
                const docxBuffer = await generateComparisonSheetDocx(comparisonData);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
                res.send(docxBuffer);
            } else {
                res.status(400).json({ success: false, message: 'Неподдерживаемый формат' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Неизвестный тип документа' });
        }
        
    } catch (error) {
        console.error('❌ Ошибка экспорта документов инвентаризации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта: ' + error.message
        });
    }
});

// Функция для экранирования HTML (защита от XSS)
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\\n/g, '<br>')
        .replace(/\\r/g, '');
}

// Функция преобразования числа в пропись (для документов)
function numberToWordsRu(num) {
    if (num === 0 || isNaN(num)) return 'ноль';
    
    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    
    function convertHundreds(n, isFemale = false) {
        const arr = isFemale ? unitsFemale : units;
        let result = '';
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        
        if (h > 0) result += hundreds[h] + ' ';
        if (t === 1) {
            result += teens[u] + ' ';
        } else {
            if (t > 1) result += tens[t] + ' ';
            if (u > 0) result += arr[u] + ' ';
        }
        return result.trim();
    }
    
    function convertNumber(n) {
        let result = '';
        const millions = Math.floor(n / 1000000);
        const thousands = Math.floor((n % 1000000) / 1000);
        const rest = n % 1000;
        
        if (millions > 0) {
            result += convertHundreds(millions) + ' ';
            const lastDigit = millions % 10;
            const lastTwo = millions % 100;
            if (lastTwo >= 11 && lastTwo <= 19) result += 'миллионов ';
            else if (lastDigit === 1) result += 'миллион ';
            else if (lastDigit >= 2 && lastDigit <= 4) result += 'миллиона ';
            else result += 'миллионов ';
        }
        
        if (thousands > 0) {
            result += convertHundreds(thousands, true) + ' ';
            const lastDigit = thousands % 10;
            const lastTwo = thousands % 100;
            if (lastTwo >= 11 && lastTwo <= 19) result += 'тысяч ';
            else if (lastDigit === 1) result += 'тысяча ';
            else if (lastDigit >= 2 && lastDigit <= 4) result += 'тысячи ';
            else result += 'тысяч ';
        }
        
        if (rest > 0) {
            result += convertHundreds(rest);
        }
        return result.trim();
    }
    
    return convertNumber(Math.floor(num));
}

// Функция генерации Инвентаризационной описи (HTML)
function generateInventoryListHtml(data) {
        // Разбираем председателя комиссии
    let commissionChairmanName = '';
    let commissionChairmanPosition = '';
    if (data.commission_chairman) {
        const match = data.commission_chairman.match(/^(.*?)\s*\((.+?)\)$/);
        if (match) {
            commissionChairmanName = match[1].trim();
            commissionChairmanPosition = match[2].trim();
        } else {
            commissionChairmanName = data.commission_chairman;
        }
    }   
    
    // Подсчет итогов
    let totalItems = data.items ? data.items.length : 0;
    let totalQuantity = 0;
    let totalAmount = 0;
    let totalBookQuantity = 0;
    let totalBookAmount = 0;
    
    if (data.items) {
        data.items.forEach(item => {
            totalQuantity += item.actual_quantity || 0;
            totalAmount += (item.actual_quantity || 0) * (item.price || 0);
            totalBookQuantity += item.book_quantity || 0;
            totalBookAmount += (item.book_quantity || 0) * (item.price || 0);
        });
    }
    
        // Формируем таблицу позиций
    let itemsHtml = '';
    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.row_num || (index + 1)}</td>
                <td style="border: 1px solid #000; padding: 6px;">${escapeHtml(item.name || '')}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${escapeHtml(item.unique_id || '')}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">шт</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(item.price || 0).toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.actual_quantity || 0}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${((item.actual_quantity || 0) * (item.price || 0)).toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${item.book_quantity || 0}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${((item.book_quantity || 0) * (item.price || 0)).toFixed(2)}</td>
            </tr>
            `;
        });
    } else {
        itemsHtml = '<tr><td colspan="9" style="border: 1px solid #000; padding: 30px; text-align: center;">Нет данных</td></tr>';
    }
    // Форматируем дату инвентаризации из БД
let inventoryDateFormatted = '';
if (data.inventory_date) {
    const d = new Date(data.inventory_date);
    inventoryDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    inventoryDateFormatted = '________';
}

// Форматируем дату начала
let startDateFormatted = '';
if (data.inventory_start_date) {
    const d = new Date(data.inventory_start_date);
    startDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else if (data.inventory_date) {
    const d = new Date(data.inventory_date);
    startDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    startDateFormatted = '________';
}

// Форматируем дату окончания
let endDateFormatted = '';
if (data.inventory_end_date) {
    const d = new Date(data.inventory_end_date);
    endDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else if (data.inventory_date) {
    const d = new Date(data.inventory_date);
    endDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    endDateFormatted = '________';
}

// Далее экранируем
inventoryDateFormatted = escapeHtml(inventoryDateFormatted);
startDateFormatted = escapeHtml(startDateFormatted);
endDateFormatted = escapeHtml(endDateFormatted);
    // Получаем значения с защитой от null
    const inventoryNumber = escapeHtml(data.inventory_number || '');
    const orderNumber = escapeHtml(data.order_number || '________');
    const orderDateFormatted = escapeHtml(data.order_date_formatted || '________');
    const commissionChairman = escapeHtml(data.commission_chairman || '__________________________');
    const responsiblePerson = escapeHtml(data.responsible_person || '__________________________');
    
        // Члены комиссии
    let commissionMembersHtml = '';
    if (data.commission_members && data.commission_members.length > 0) {
        data.commission_members.forEach((member, idx) => {
            // Разбираем ФИО и должность если они в формате "ФИО (должность)"
            let memberName = member;
            let memberPosition = '';
            const match = member.match(/^(.*?)\s*\((.+?)\)$/);
            if (match) {
                memberName = match[1].trim();
                memberPosition = match[2].trim();
            }
            
            commissionMembersHtml += `
            <div class="signature-row">
                <div class="signature-label">Член комиссии:</div>
                <div class="signature-fields">
                    <div class="signature-field">
                        <div class="signature-line">${escapeHtml(memberPosition)}</div>
                        <div class="signature-hint">(должность)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(подпись)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line">${escapeHtml(memberName)}</div>
                        <div class="signature-hint">(расшифровка подписи)</div>
                    </div>
                </div>
            </div>
            `;
        });
    } else {
        commissionMembersHtml = `
            <div class="signature-row">
                <div class="signature-label">Член комиссии:</div>
                <div class="signature-fields">
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(должность)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(подпись)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(расшифровка подписи)</div>
                    </div>
                </div>
            </div>
        `;
    }
    
       return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Инвентаризационная опись № ${inventoryNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 10pt;
            margin: 20mm 15mm; 
            line-height: 1.3; 
        }
        
        /* Стили для заголовка - три строки по центру */
        .inventory-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .inventory-header .title-main {
            font-size: 15pt;
            font-weight: bold;
            margin: 0;
            padding: 0;
            line-height: 1.4;
        }
        .inventory-header .title-sub {
            font-size: 12pt;
            font-weight: bold;
            margin: 8px 0;
            padding: 0;
            line-height: 1.4;
        }
        .inventory-header .inventory-number {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 8px;
            letter-spacing: 0.5px;
        }
        
        /* Стили для информационных блоков */
        .header-info { 
            margin: 20px 0 25px 0;
        }
        .info-row { 
            display: flex; 
            margin-bottom: 15px;
            align-items: center;
        }
        .info-label { 
            width: 280px; 
            font-weight: bold;
            font-size: 13pt;
        }
        .info-value { 
            flex: 1; 
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            font-size: 13pt;
        }
        
        /* Стили для расписки */
        .receipt { 
            margin: 25px 0 30px 0;
        }
        .receipt-title {
            text-align: center;
            font-size: 15pt;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .receipt-text {
            text-align: justify;
            font-size: 13pt;
            line-height: 1.4;
        }
        
        /* Стили для материально ответственного лица вверху */
        .responsible-person {
            margin: 25px 0 20px 0;
            display: flex;
            align-items: center;
        }
        .responsible-label {
            font-weight: bold;
            font-size: 13pt;
            white-space: nowrap;
            width: 280px;
            margin-right: 80px;
        }
        .responsible-fields {
            display: flex;
            gap: 20px;
            flex: 1;
            align-items: flex-end;
        }
        .responsible-field {
            flex: 1;
            min-width: 140px;
            max-width: 200px;
        }
        .responsible-line {
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            min-height: 22px;
            font-size: 13pt;
        }
        .responsible-hint {
            font-size: 11pt;
            color: #555;
            text-align: center;
            margin-top: 2px;
        }
        
        /* Стили для таблицы */
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
            font-size: 13pt;
        }
        th, td { 
            border: 1px solid #000; 
            padding: 6px; 
            vertical-align: middle; 
        }
        th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center;
            font-size: 12pt;
            vertical-align: middle;
        }
        td {
            font-size: 12pt;
        }
        
        /* Стили для итогов по странице и описи */
        .page-total {
            margin: 20px 0 15px 0;
            font-size: 14pt;

        }
        .page-total-title {
            font-weight: bold;
            font-size: 16pt;
            text-align: center;
            margin-bottom: 15px;
        }
        
        /* Стили для итогов прописью */
        .words {
            margin: 15px 0 25px 0;
        }
        .words-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }
        .words-label {
            width: 280px;
            font-weight: bold;
            font-size: 13pt;
        }
        .words-value {
            flex: 1;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            font-size: 13pt;
        }
        
        /* Стили для подписей */
        .signatures {
            margin-top: 30px;
        }
        .signature-row {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .signature-label {
            width: 280px;
            font-weight: bold;
            font-size: 13pt;
            white-space: nowrap;
                        margin-right: 50px;

        }
        .signature-fields {
            display: flex;
            gap: 20px;
            flex: 1;
            align-items: flex-end;
        }
        .signature-field {
            flex: 1;
            min-width: 140px;
            max-width: 200px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            min-height: 22px;
            font-size: 13pt;
        }
        .signature-hint {
            font-size: 11pt;
            color: #555;
            text-align: center;
            margin-top: 2px;
        }
        
        .footer-note { 
            margin: 25px 0 30px 0;
            font-size: 14pt;
            text-align: justify;
            line-height: 1.4;
        }
        
        /* Специальный стиль для последнего поля с проверкой */
        .signature-label-check {
            width: 350px;
            font-weight: bold;
            font-size: 14pt;
            white-space: normal;
            line-height: 1.3;
            margin-right: 30px;
        }
    </style>
</head>
<body>
    <!-- ЗАГОЛОВОК - ТРИ СТРОКИ ПО ЦЕНТРУ -->
    <div class="inventory-header">
        <div class="title-main">ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ</div>
        <div class="title-main">оборотных активов</div>
        <div class="title-main">${inventoryNumber}</div>
    </div>
    
    <!-- ИНФОРМАЦИОННЫЙ БЛОК -->
    <div class="header-info">
        <div class="info-row">
            <div class="info-label">Наименование организации:</div>
            <div class="info-value">НПУП «АТОМТЕХ»</div>
        </div>
        <div class="info-row">
            <div class="info-label">Подразделение организации:</div>
            <div class="info-value">Основной склад</div>
        </div>
        <div class="info-row">
            <div class="info-label">Основание для проведения инвентаризации:</div>
            <div class="info-value">Приказ № ${orderNumber} от ${orderDateFormatted}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Дата начала инвентаризации:</div>
            <div class="info-value">${startDateFormatted}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Дата окончания инвентаризации:</div>
            <div class="info-value">${endDateFormatted}</div>
        </div>
    </div>
    
    <!-- РАСПИСКА -->
    <div class="receipt">
        <div class="receipt-title">РАСПИСКА</div>
        <div class="receipt-text">К началу проведения инвентаризации все расходные и приходные документы на оборотные активы сданы в бухгалтерию и все оборотные активы, поступившие на мою (нашу) ответственность, оприходованы, а выбывшие списаны в расход.</div>
    </div>
    
    <!-- МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО (ВВЕРХУ) -->
    <div class="responsible-person">
        <div class="responsible-label">Материально ответственное(ые) лицо(а):</div>
        <div class="responsible-fields">
            <div class="responsible-field">
                <div class="responsible-line">Заведующий склада</div>
                <div class="responsible-hint">(должность)</div>
            </div>
            <div class="responsible-field">
                <div class="responsible-line"></div>
                <div class="responsible-hint">(подпись)</div>
            </div>
            <div class="responsible-field">
                <div class="responsible-line">Иванов П.В.</div>
                <div class="responsible-hint">(расшифровка подписи)</div>
            </div>
        </div>
    </div>
    
    <!-- ТАБЛИЦА С ПРИБОРАМИ -->
    <table>
        <thead>
            <tr>
                <th rowspan="3">№ п/п</th>
                <th colspan="2">Оборотные активы</th>
                <th rowspan="3">Единица измерения</th>
                <th rowspan="3">Цена, руб.</th>
                <th colspan="2">Фактическое наличие</th>
                <th colspan="2">По данным бухгалтерского учета</th>
            </tr>
            <tr>
                <th rowspan="2">наименование, вид, сорт, группа</th>
                <th rowspan="2">номенклатурный номер (при его наличии)</th>
                <th rowspan="2">количество</th>
                <th rowspan="2">сумма, руб.</th>
                <th rowspan="2">количество</th>
                <th rowspan="2">сумма, руб.</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="5" style="text-align: right; font-weight: bold;">Итого по описи:</td>
                <td style="text-align: right; font-weight: bold;">${totalQuantity}</td>
                <td style="text-align: right; font-weight: bold;">${totalAmount.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold;">${totalBookQuantity}</td>
                <td style="text-align: right; font-weight: bold;">${totalBookAmount.toFixed(2)}</td>
            </tr>
        </tfoot>
    </table>
    
    <!-- ИТОГО ПО СТРАНИЦЕ -->
    <div class="page-total">
        <div class="page-total-title">Итого по странице</div>
    </div>
    
    <div class="words">
        <div class="words-row">
            <div class="words-label">количество порядковых номеров:</div>
            <div class="words-value">${totalItems} (${numberToWordsRu(totalItems)})</div>
        </div>
        <div class="words-row">
            <div class="words-label">общее количество единиц фактически:</div>
            <div class="words-value">${totalQuantity} (${numberToWordsRu(totalQuantity)})</div>
        </div>
        <div class="words-row">
            <div class="words-label">на сумму, руб., фактически:</div>
            <div class="words-value">${totalAmount.toFixed(2)} (${numberToWordsRu(Math.floor(totalAmount))} рублей ${Math.round((totalAmount % 1) * 100)} копеек)</div>
        </div>
    </div>
    
    <!-- ИТОГО ПО ОПИСИ -->
    <div class="page-total">
        <div class="page-total-title">Итого по описи</div>
    </div>
    
    <div class="words">
        <div class="words-row">
            <div class="words-label">количество порядковых номеров:</div>
            <div class="words-value">${totalItems} (${numberToWordsRu(totalItems)})</div>
        </div>
        <div class="words-row">
            <div class="words-label">общее количество единиц фактически:</div>
            <div class="words-value">${totalQuantity} (${numberToWordsRu(totalQuantity)})</div>
        </div>
        <div class="words-row">
            <div class="words-label">на сумму, руб., фактически:</div>
            <div class="words-value">${totalAmount.toFixed(2)} (${numberToWordsRu(Math.floor(totalAmount))} рублей ${Math.round((totalAmount % 1) * 100)} копеек)</div>
        </div>
    </div>
    
    <!-- ПОДПИСИ -->
    <div class="signatures">
        <!-- ПРЕДСЕДАТЕЛЬ КОМИССИИ -->
        <div class="signature-row">
            <div class="signature-label">Председатель комиссии:</div>
            <div class="signature-fields">
                <div class="signature-field">
                    <div class="signature-line">${commissionChairmanPosition || ''}</div>
                    <div class="signature-hint">(должность)</div>
                </div>
                <div class="signature-field">
                    <div class="signature-line"></div>
                    <div class="signature-hint">(подпись)</div>
                </div>
                <div class="signature-field">
                    <div class="signature-line">${commissionChairmanName || ''}</div>
                    <div class="signature-hint">(расшифровка подписи)</div>
                </div>
            </div>
        </div>
        
        <!-- ЧЛЕНЫ КОМИССИИ -->
        ${commissionMembersHtml}
    </div>
    
    <!-- ПРИМЕЧАНИЕ О ПРОВЕРКЕ АКТИВОВ -->
    <div class="footer-note">
        <p>Все активы, поименованные в настоящей инвентаризационной описи с № 1 по № ${totalItems}, комиссией проверены в натуре в моем (нашем) присутствии и внесены в опись, в связи с чем претензий к инвентаризационной комиссии не имею (не имеем). Активы, перечисленные в описи, находятся на моем (нашем) ответственном хранении.</p>
    </div>
    
    <!-- МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО (ВНИЗУ) -->
    <div class="signature-row">
        <div class="signature-label">Материально ответственное лицо:</div>
        <div class="signature-fields">
            <div class="signature-field">
                <div class="signature-line">Заведующий склада</div>
                <div class="signature-hint">(должность)</div>
            </div>
            <div class="signature-field">
                <div class="signature-line"></div>
                <div class="signature-hint">(подпись)</div>
            </div>
            <div class="signature-field">
                <div class="signature-line">Иванов П.В.</div>
                <div class="signature-hint">(расшифровка подписи)</div>
            </div>
        </div>
    </div>
    
    <!-- УКАЗАННЫЕ В ОПИСИ ДАННЫЕ ПОДСЧЕТЫ ПРОВЕРИЛ -->
    <div class="signature-row">
        <div class="signature-label-check">Указанные в настоящей описи данные и подсчеты проверил:</div>
        <div class="signature-fields">
            <div class="signature-field">
                <div class="signature-line"></div>
                <div class="signature-hint">(должность)</div>
            </div>
            <div class="signature-field">
                <div class="signature-line"></div>
                <div class="signature-hint">(подпись)</div>
            </div>
            <div class="signature-field">
                <div class="signature-line"></div>
                <div class="signature-hint">(расшифровка подписи)</div>
            </div>
        </div>
    </div>
    
</body>
</html>`;
}

function generateComparisonSheetHtml(data) {
    // Подсчет итогов
    let totalSurplusQty = 0;
    let totalSurplusAmount = 0;
    let totalShortageQty = 0;
    let totalShortageAmount = 0;
    let totalItems = data.items ? data.items.length : 0;
    
    if (data.items) {
        data.items.forEach(item => {
            const diff = item.difference || 0;
            const price = item.price || 0;
            if (diff > 0) {
                totalSurplusQty += diff;
                totalSurplusAmount += diff * price;
            } else if (diff < 0) {
                const shortage = Math.abs(diff);
                totalShortageQty += shortage;
                totalShortageAmount += shortage * price;
            }
        });
    }
    
    // Формируем таблицу позиций
    let itemsHtml = '';
    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            const diff = item.difference || 0;
            const surplusQty = diff > 0 ? diff : 0;
            const shortageQty = diff < 0 ? Math.abs(diff) : 0;
            const surplusAmount = surplusQty * (item.price || 0);
            const shortageAmount = shortageQty * (item.price || 0);
            
            itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.row_num || (index + 1)}</td>
                <td style="border: 1px solid #000; padding: 4px;">${escapeHtml(item.name || '')}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${escapeHtml(item.unique_id || '')}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">шт</td>
                <!-- Излишек -->
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${surplusQty}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${surplusAmount.toFixed(2)}</td>
                <!-- Недостача -->
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${shortageQty}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${shortageAmount.toFixed(2)}</td>
                <!-- Может быть предложено к зачету - излишек -->
<td style="border: 1px solid #000; padding: 4px; text-align: center;">${surplusQty > 0 ? surplusQty : ''}</td>                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${surplusQty > 0 ? surplusAmount.toFixed(2) : ''}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${surplusQty > 0 ? index + 1 : ''}</td>
                <!-- Может быть предложено к зачету - недостача -->
<td style="border: 1px solid #000; padding: 4px; text-align: center;">${shortageQty > 0 ? shortageQty : ''}</td>                <td style="border: 1px solid #000; padding: 4px; text-align: right;">${shortageQty > 0 ? shortageAmount.toFixed(2) : ''}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${shortageQty > 0 ? index + 1 : ''}</td>
            </tr>
            `;
        });
    } else {
        itemsHtml = '<tr><td colspan="14" style="border: 1px solid #000; padding: 30px; text-align: center;">Нет расхождений</td></tr>';
    }
    let inventoryDateFormatted = '';
if (data.inventory_date) {
    const d = new Date(data.inventory_date);
    inventoryDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    inventoryDateFormatted = '________';
}
inventoryDateFormatted = escapeHtml(inventoryDateFormatted);
    // Получаем значения
    const inventoryNumber = escapeHtml(data.inventory_number || '');
    const orderNumber = escapeHtml(data.order_number || '________');
// СТАЛО
let orderDateFormatted = '';
if (data.order_date) {
    const d = new Date(data.order_date);
    orderDateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    orderDateFormatted = '________';
}
orderDateFormatted = escapeHtml(orderDateFormatted);    
    // Разбираем председателя комиссии
    let commissionChairmanName = '';
    let commissionChairmanPosition = '';
    if (data.commission_chairman) {
        const match = data.commission_chairman.match(/^(.*?)\s*\((.+?)\)$/);
        if (match) {
            commissionChairmanName = match[1].trim();
            commissionChairmanPosition = match[2].trim();
        } else {
            commissionChairmanName = data.commission_chairman;
        }
    }
    
    // Члены комиссии
    let commissionMembersHtml = '';
    if (data.commission_members && data.commission_members.length > 0) {
        data.commission_members.forEach((member, idx) => {
            let memberName = member;
            let memberPosition = '';
            const match = member.match(/^(.*?)\s*\((.+?)\)$/);
            if (match) {
                memberName = match[1].trim();
                memberPosition = match[2].trim();
            }
            
            commissionMembersHtml += `
            <div class="signature-row">
                <div class="signature-label">Члены комиссии:</div>
                <div class="signature-fields">
                    <div class="signature-field">
                        <div class="signature-line">${escapeHtml(memberPosition)}</div>
                        <div class="signature-hint">(должность)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(подпись)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line">${escapeHtml(memberName)}</div>
                        <div class="signature-hint">(расшифровка подписи)</div>
                    </div>
                </div>
            </div>
            `;
        });
    } else {
        commissionMembersHtml = `
            <div class="signature-row">
                <div class="signature-label">Члены комиссии:</div>
                <div class="signature-fields">
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(должность)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(подпись)</div>
                    </div>
                    <div class="signature-field">
                        <div class="signature-line"></div>
                        <div class="signature-hint">(расшифровка подписи)</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Сличительная ведомость № ${inventoryNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 10pt;
            margin: 20mm 10mm; 
            line-height: 1.2; 
        }
        
        /* Заголовок */
        .header-title {
            text-align: center;
            margin-bottom: 20px;
        }
        .header-title .title-main {
            font-size: 15pt;
            font-weight: bold;
            margin: 0;
            padding: 0;
            line-height: 1.4;
        }
        .header-title .title-sub {
            font-size: 12pt;
            font-weight: bold;
            margin: 5px 0;
            padding: 0;
            line-height: 1.4;
        }
        .header-title .inventory-number {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 8px;
            text-align: center;
        }
        
        /* Информационные блоки */
        .header-info { 
            margin: 20px 0 25px 0;
        }
        .info-row { 
            display: flex; 
            margin-bottom: 10px;
            align-items: center;
        }
        .info-label { 
            width: 250px; 
            font-weight: bold;
            font-size: 13pt;
        }
        .info-value { 
            flex: 1; 
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            font-size: 13pt;
        }
        
        /* Таблица */
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0; 
            font-size: 8pt;
        }
        th, td { 
            border: 1px solid #000; 
            padding: 4px; 
            vertical-align: middle; 
        }
        th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center;
            font-size: 12pt;
            vertical-align: middle;
        }
        td {
            font-size: 12pt;
        }
        
        /* Подписи */
        .signatures {
            margin-top: 30px;
        }
        .signature-row {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .signature-label {
            width: 200px;
            font-weight: bold;
            font-size: 13pt;
            white-space: nowrap;
            margin-right:50px;
        }
        .signature-fields {
            display: flex;
            gap: 20px;
            flex: 1;
            align-items: flex-end;
        }
        .signature-field {
            flex: 1;
            min-width: 140px;
            max-width: 200px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            min-height: 22px;
            font-size: 13pt;
        }
        .signature-hint {
            font-size: 9pt;
            color: #555;
            text-align: center;
            margin-top: 2px;
        }
    </style>
</head>
<body>
    <!-- ЗАГОЛОВОК -->
    <div class="header-title">
        <div class="title-main">СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ</div>
        <div class="title-main">результатов инвентаризации товаров</div>
        <div class="title-main">№ ${inventoryNumber} от ${inventoryDateFormatted}</div>
    </div>
    
    <!-- ИНФОРМАЦИОННЫЙ БЛОК -->
    <div class="header-info">
        <div class="info-row">
            <div class="info-label">Наименование организации:</div>
            <div class="info-value">НПУП «АТОМТЕХ»</div>
        </div>
        <div class="info-row">
            <div class="info-label">Подразделение организации:</div>
            <div class="info-value">Основной склад</div>
        </div>
        <div class="info-row">
            <div class="info-label">Основание для проведения инвентаризации:</div>
            <div class="info-value">Приказ № ${orderNumber} от ${orderDateFormatted}</div>
        </div>
        <div class="info-row">
            <div class="info-label">К инвентаризационной описи:</div>
            <div class="info-value">№ ${inventoryNumber} от ${inventoryDateFormatted}</div>
        </div>
    </div>
    
    <!-- ТАБЛИЦА -->
    <table>
        <thead>
            <tr>
                <th rowspan="3">№ п/п</th>
                <th rowspan="3">наименование</th>
                <th rowspan="3">номенклатурный, инвентарный или иной номер</th>
                <th rowspan="3">Единица измерения</th>
                <th colspan="4">Отклонения, выявленные при инвентаризации</th>
                <th colspan="7">Может быть предложено к зачету излишков и недостач в результате пересортицы</th>
            </tr>
            <tr>
                <th colspan="2">излишек</th>
                <th colspan="2">недостача</th>
                <th colspan="3">излишек</th>
                <th colspan="3">недостача</th>
            </tr>
            <tr>
                <th>количество</th>
                <th>сумма, руб.</th>
                <th>количество</th>
                <th>сумма, руб.</th>
                <th>количество</th>
                <th>сумма, руб.</th>
                <th>номер строки, по которому отражена недостача</th>
                <th>количество</th>
                <th>сумма, руб.</th>
                <th>номер строки, по которому отражена недостача</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
        <tfoot>
    <tr>
        <td colspan="4" style="text-align: right; font-weight: bold;">Итого:</noscript>
        <td style="text-align: right; font-weight: bold;">${totalSurplusQty}</noscript>
        <td style="text-align: right; font-weight: bold;">${totalSurplusAmount.toFixed(2)}</noscript>
        <td style="text-align: right; font-weight: bold;">${totalShortageQty}</noscript>
        <td style="text-align: right; font-weight: bold;">${totalShortageAmount.toFixed(2)}</noscript>
        <!-- Излишек к зачету (итого) -->
        <td style="text-align: center; font-weight: bold;">${totalSurplusQty > 0 ? totalSurplusQty : ''}</noscript>
        <td style="text-align: right; font-weight: bold;">${totalSurplusQty > 0 ? totalSurplusAmount.toFixed(2) : ''}</noscript>
        <td style="text-align: center;"></noscript>
        <!-- Недостача к зачету (итого) -->
        <td style="text-align: center; font-weight: bold;">${totalShortageQty > 0 ? totalShortageQty : ''}</noscript>
        <td style="text-align: right; font-weight: bold;">${totalShortageQty > 0 ? totalShortageAmount.toFixed(2) : ''}</noscript>
        <td style="text-align: center;"></noscript>
    </tr>
</tfoot>
    </table>
    
    <!-- ПОДПИСИ -->
    <div class="signatures">
        <!-- ПРЕДСЕДАТЕЛЬ КОМИССИИ -->
        <div class="signature-row">
            <div class="signature-label">Председатель комиссии:</div>
            <div class="signature-fields">
                <div class="signature-field">
                    <div class="signature-line">${escapeHtml(commissionChairmanPosition)}</div>
                    <div class="signature-hint">(должность)</div>
                </div>
                <div class="signature-field">
                    <div class="signature-line"></div>
                    <div class="signature-hint">(подпись)</div>
                </div>
                <div class="signature-field">
                    <div class="signature-line">${escapeHtml(commissionChairmanName)}</div>
                    <div class="signature-hint">(расшифровка подписи)</div>
                </div>
            </div>
        </div>
        
        <!-- ЧЛЕНЫ КОМИССИИ -->
        ${commissionMembersHtml}
        
                <!-- МАТЕРИАЛЬНО ОТВЕТСТВЕННОЕ ЛИЦО -->
        <div class="signature-row">
            <div class="signature-label" style="margin-right: 90px;">Материально ответственное лицо:</div>
            <div class="signature-fields">
                <div class="signature-field">
                    <div class="signature-line">Заведующий склада</div>
                    <div class="signature-hint">(должность)</div>
                </div>
                <div class="signature-field">
                    <div class="signature-line"></div>
                    <div class="signature-hint">(подпись)</div>
                </div>
                <div class="signature-field">
                    <div class="signature-line">Иванов П.В.</div>
                    <div class="signature-hint">(расшифровка подписи)</div>
                </div>
            </div>
        </div>
    </div>
    
</body>
</html>`;
}



async function generateInventoryListDocx(data) {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
    
    const children = [];
    
    // Нет границ для всех таблиц
    const noBorder = { 
        top: { style: BorderStyle.NONE }, 
        bottom: { style: BorderStyle.NONE }, 
        left: { style: BorderStyle.NONE }, 
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
    };
    
    children.push(new Paragraph({
        children: [new TextRun({ text: 'ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ', bold: true, size: 28, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: 'оборотных активов', bold: true, size: 24, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: `№ ${data.inventory_number || ''}`, bold: true, size: 24, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
    }));
    
    const orderNumber = data.order_number || '________';
    const orderDate = data.order_date_formatted || '________';
    const startDate = data.start_date_formatted || data.inventory_date_formatted || '________';
    const endDate = data.end_date_formatted || data.inventory_date_formatted || '________';
    
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Наименование организации:', bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: ' НПУП «АТОМТЕХ»', size: 24, font: "Times New Roman" })
        ],
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Подразделение организации:', bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: ' Основной склад', size: 24, font: "Times New Roman" })
        ],
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Основание для проведения инвентаризации:', bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` Приказ № ${orderNumber} от ${orderDate}`, size: 24, font: "Times New Roman" })
        ],
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Дата начала инвентаризации:', bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` ${startDate}`, size: 24, font: "Times New Roman" })
        ],
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Дата окончания инвентаризации:', bold: true, size: 24, font: "Times New Roman" }),
            new TextRun({ text: ` ${endDate}`, size: 24, font: "Times New Roman" })
        ],
        spacing: { after: 200 }
    }));
    
    children.push(new Paragraph({
        children: [new TextRun({ text: 'РАСПИСКА', bold: true, size: 28, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ 
            text: 'К началу проведения инвентаризации все расходные и приходные документы на оборотные активы сданы в бухгалтерию и все оборотные активы, поступившие на мою (нашу) ответственность, оприходованы, а выбывшие списаны в расход.',
            size: 22,
            font: "Times New Roman"
        })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 }
    }));
    
    // Получаем значения
    let responsiblePersonName = '';
    let responsiblePersonPosition = '';
    if (data.responsible_person) {
        const match = data.responsible_person.match(/^(.*?)\s*\((.+?)\)$/);
        if (match) {
            responsiblePersonName = match[1].trim();
            responsiblePersonPosition = match[2].trim();
        } else {
            responsiblePersonName = data.responsible_person;
        }
    }
    if (!responsiblePersonName) responsiblePersonName = '___________________';
    if (!responsiblePersonPosition) responsiblePersonPosition = '___________________';
    
    let commissionChairmanName = '';
    let commissionChairmanPosition = '';
    if (data.commission_chairman) {
        const match = data.commission_chairman.match(/^(.*?)\s*\((.+?)\)$/);
        if (match) {
            commissionChairmanName = match[1].trim();
            commissionChairmanPosition = match[2].trim();
        } else {
            commissionChairmanName = data.commission_chairman;
        }
    }
    if (!commissionChairmanName) commissionChairmanName = '___________________';
    if (!commissionChairmanPosition) commissionChairmanPosition = '___________________';
    
    let commissionMembersList = [];
    if (data.commission_members) {
        try {
            if (typeof data.commission_members === 'string') {
                commissionMembersList = JSON.parse(data.commission_members);
            } else if (Array.isArray(data.commission_members)) {
                commissionMembersList = data.commission_members;
            }
        } catch(e) {
            commissionMembersList = [];
        }
    }
    
    const border = { style: BorderStyle.SINGLE, size: 1 };
    const tableBorder = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
    
    const headerRow = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '№ п/п', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Наименование, вид, сорт, группа', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Номенклатурный номер', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Ед. изм', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Цена, руб.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Факт. кол-во', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Факт. сумма, руб.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Учет. кол-во', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'Учет. сумма, руб.', bold: true, alignment: AlignmentType.CENTER, size: 20, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
        ]
    });
    
    const tableRows = [headerRow];
    
    let totalQuantity = 0, totalAmount = 0, totalBookQuantity = 0, totalBookAmount = 0;
    
    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            const actualQuantity = item.actual_quantity || 0;
            const actualAmount = actualQuantity * (item.price || 0);
            const bookQuantity = item.book_quantity || 0;
            const bookAmount = bookQuantity * (item.price || 0);
            
            totalQuantity += actualQuantity;
            totalAmount += actualAmount;
            totalBookQuantity += bookQuantity;
            totalBookAmount += bookAmount;
            
            tableRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: item.name || '', size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: item.unique_id || '', alignment: AlignmentType.CENTER, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'шт', alignment: AlignmentType.CENTER, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: (item.price || 0).toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: actualQuantity.toString(), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: actualAmount.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: bookQuantity.toString(), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: bookAmount.toFixed(2), alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder })
                ]
            }));
        });
    }
    
    tableRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '', size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'ИТОГО по описи:', bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder, columnSpan: 4 }),
            new TableCell({ children: [new Paragraph({ text: totalQuantity.toString(), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalBookQuantity.toString(), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalBookAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 22, font: "Times New Roman" })], borders: tableBorder })
        ]
    }));
    
    const table = new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder });
    children.push(table);
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    
    const totalItems = data.items ? data.items.length : 0;
    
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Итого по странице', bold: true, size: 24, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
    }));
    
    children.push(new Paragraph({
        children: [new TextRun({ text: `количество порядковых номеров: ${totalItems} (${numberToWordsRu(totalItems)})`, size: 22, font: "Times New Roman" })],
        spacing: { after: 50 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: `общее количество единиц фактически: ${totalQuantity} (${numberToWordsRu(totalQuantity)})`, size: 22, font: "Times New Roman" })],
        spacing: { after: 50 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: `на сумму, руб., фактически: ${totalAmount.toFixed(2)} (${numberToWordsRu(Math.floor(totalAmount))} рублей ${Math.round((totalAmount % 1) * 100)} копеек)`, size: 22, font: "Times New Roman" })],
        spacing: { after: 300 }
    }));
    
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Итого по описи', bold: true, size: 24, font: "Times New Roman" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
    }));
    
    children.push(new Paragraph({
        children: [new TextRun({ text: `количество порядковых номеров: ${totalItems} (${numberToWordsRu(totalItems)})`, size: 22, font: "Times New Roman" })],
        spacing: { after: 50 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: `общее количество единиц фактически: ${totalQuantity} (${numberToWordsRu(totalQuantity)})`, size: 22, font: "Times New Roman" })],
        spacing: { after: 50 }
    }));
    children.push(new Paragraph({
        children: [new TextRun({ text: `на сумму, руб., фактически: ${totalAmount.toFixed(2)} (${numberToWordsRu(Math.floor(totalAmount))} рублей ${Math.round((totalAmount % 1) * 100)} копеек)`, size: 22, font: "Times New Roman" })],
        spacing: { after: 300 }
    }));
        
    // Функция для создания таблицы подписи (без границ)
    function createSignatureTable(label, positionValue, nameValue) {
        const rows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: label, bold: true, size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: positionValue, size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 23, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: '___________________', size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 23, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: nameValue, size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 24, type: WidthType.PERCENTAGE } })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: noBorder }),
                    new TableCell({ children: [new Paragraph({ text: '(должность)', size: 18, color: "555555", font: "Times New Roman" })], borders: noBorder }),
                    new TableCell({ children: [new Paragraph({ text: '(подпись)', size: 18, color: "555555", font: "Times New Roman" })], borders: noBorder }),
                    new TableCell({ children: [new Paragraph({ text: '(расшифровка подписи)', size: 18, color: "555555", font: "Times New Roman" })], borders: noBorder })
                ]
            })
        ];
        return new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorder });
    }
    
    // Материально ответственное лицо (вверху)
    children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
    children.push(createSignatureTable('Материально ответственное(ые) лицо(а):', responsiblePersonPosition, responsiblePersonName));
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    
    // Председатель комиссии
    children.push(createSignatureTable('Председатель комиссии:', commissionChairmanPosition, commissionChairmanName));
    children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    
    // Члены комиссии
    if (commissionMembersList.length > 0) {
        commissionMembersList.forEach((member, idx) => {
            let memberName = member;
            let memberPosition = '';
            if (typeof member === 'string') {
                const match = member.match(/^(.*?)\s*\((.+?)\)$/);
                if (match) {
                    memberName = match[1].trim();
                    memberPosition = match[2].trim();
                }
            }
            if (!memberName) memberName = '___________________';
            if (!memberPosition) memberPosition = '___________________';
            
            children.push(createSignatureTable(idx === 0 ? 'Члены комиссии:' : '', memberPosition, memberName));
            children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
        });
    } else {
        children.push(createSignatureTable('Члены комиссии:', '___________________', '___________________'));
        children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    }
    
    children.push(new Paragraph({
        children: [new TextRun({ 
            text: `Все активы, поименованные в настоящей инвентаризационной описи с № 1 по № ${totalItems}, комиссией проверены в натуре в моем (нашем) присутствии и внесены в опись, в связи с чем претензий к инвентаризационной комиссии не имею (не имеем). Активы, перечисленные в описи, находятся на моем (нашем) ответственном хранении.`,
            size: 22,
            font: "Times New Roman"
        })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 }
    }));
    
    // Материально ответственное лицо (внизу)
    children.push(createSignatureTable('Материально ответственное лицо:', responsiblePersonPosition, responsiblePersonName));
    children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    
    // Проверил
    children.push(createSignatureTable('Указанные в настоящей описи данные и подсчеты проверил:', '___________________', '___________________'));
    children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman" }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,
                        bottom: 1440,
                        left: 1440,
                        right: 720
                    }
                }
            },
            children: children
        }]
    });
    
    return await Packer.toBuffer(doc);
}

// Функция генерации DOCX для сличительной ведомости
async function generateComparisonSheetDocx(data) {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
    
    const children = [];
    
    // Нет границ для таблиц подписей
    const noBorder = { 
        top: { style: BorderStyle.NONE }, 
        bottom: { style: BorderStyle.NONE }, 
        left: { style: BorderStyle.NONE }, 
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
    };
    
    // Заголовок
    children.push(new Paragraph({
        text: 'СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ',
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 28,
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: 'результатов инвентаризации товаров',
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 24,
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: `№ ${data.inventory_number || ''} от ${data.inventory_date_formatted || ''}`,
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 24,
        spacing: { after: 400 }
    }));
    
    // Информационный блок
    const infoRows = [
        ['Наименование организации:', 'НПУП «АТОМТЕХ»'],
        ['Подразделение организации:', 'Основной склад'],
        ['Основание для проведения инвентаризации:', `Приказ № ${data.order_number || '________'} от ${data.order_date_formatted || '________'}`],
        ['К инвентаризационной описи:', `№ ${data.inventory_number || ''} от ${data.inventory_date_formatted || ''}`]
    ];
    
    infoRows.forEach(row => {
        children.push(new Paragraph({
            children: [
                new TextRun({ text: row[0], bold: true, size: 24, font: "Times New Roman" }),
                new TextRun({ text: ' ', size: 24 }),
                new TextRun({ text: row[1], size: 24, font: "Times New Roman" })
            ],
            spacing: { after: 100 }
        }));
    });
    
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    
    const border = { style: BorderStyle.SINGLE, size: 1 };
    const tableBorder = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
    
    const tableRows = [];
    
    // Заголовки (одна строка)
    const headerCells = [
        '№ п/п', 'Наименование', 'Номенклатурный номер', 'Ед. изм',
        'Излишек кол-во', 'Излишек сумма', 'Недостача кол-во', 'Недостача сумма',
        'Зачет излишек', 'Зачет излишек сумма', 'Зачет излишек строка',
        'Зачет недостача', 'Зачет недостача сумма', 'Зачет недостача строка'
    ];
    tableRows.push(new TableRow({
        children: headerCells.map(h => new TableCell({ 
            children: [new Paragraph({ text: h, bold: true, alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })],
            shading: { fill: "D9E1F2" },
            borders: tableBorder
        }))
    }));
    
    // Данные
    let totalSurplusQty = 0, totalSurplusAmount = 0, totalShortageQty = 0, totalShortageAmount = 0;
    
    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            const diff = item.difference || 0;
            const surplusQty = diff > 0 ? diff : 0;
            const shortageQty = diff < 0 ? Math.abs(diff) : 0;
            const surplusAmount = surplusQty * (item.price || 0);
            const shortageAmount = shortageQty * (item.price || 0);
            
            totalSurplusQty += surplusQty;
            totalSurplusAmount += surplusAmount;
            totalShortageQty += shortageQty;
            totalShortageAmount += shortageAmount;
            
            tableRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: item.name || '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: item.unique_id || '', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'шт', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: surplusQty.toString(), alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: surplusAmount.toFixed(2), alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: shortageQty.toString(), alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: shortageAmount.toFixed(2), alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: surplusQty > 0 ? 'X' : '', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: surplusQty > 0 ? surplusAmount.toFixed(2) : '', alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: surplusQty > 0 ? (index + 1).toString() : '', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: shortageQty > 0 ? 'X' : '', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: shortageQty > 0 ? shortageAmount.toFixed(2) : '', alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: shortageQty > 0 ? (index + 1).toString() : '', alignment: AlignmentType.CENTER, size: 18, font: "Times New Roman" })], borders: tableBorder })
                ]
            }));
        });
    }
    
    // Итоговая строка
    tableRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: 'ИТОГО:', bold: true, alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalSurplusQty.toString(), bold: true, alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalSurplusAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalShortageQty.toString(), bold: true, alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: totalShortageAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder }),
            new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: tableBorder })
        ]
    }));
    
    const table = new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder });
    children.push(table);
    children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
        
    // Получаем значения
    let responsiblePersonName = '';
    let responsiblePersonPosition = '';
    if (data.responsible_person) {
        const match = data.responsible_person.match(/^(.*?)\s*\((.+?)\)$/);
        if (match) {
            responsiblePersonName = match[1].trim();
            responsiblePersonPosition = match[2].trim();
        } else {
            responsiblePersonName = data.responsible_person;
        }
    }
    if (!responsiblePersonName) responsiblePersonName = '___________________';
    if (!responsiblePersonPosition) responsiblePersonPosition = '___________________';
    
    let commissionChairmanName = '';
    let commissionChairmanPosition = '';
    if (data.commission_chairman) {
        const match = data.commission_chairman.match(/^(.*?)\s*\((.+?)\)$/);
        if (match) {
            commissionChairmanName = match[1].trim();
            commissionChairmanPosition = match[2].trim();
        } else {
            commissionChairmanName = data.commission_chairman;
        }
    }
    if (!commissionChairmanName) commissionChairmanName = '___________________';
    if (!commissionChairmanPosition) commissionChairmanPosition = '___________________';
    
    let commissionMembersList = [];
    if (data.commission_members) {
        try {
            if (typeof data.commission_members === 'string') {
                commissionMembersList = JSON.parse(data.commission_members);
            } else if (Array.isArray(data.commission_members)) {
                commissionMembersList = data.commission_members;
            }
        } catch(e) {
            commissionMembersList = [];
        }
    }
    
    // Функция для создания таблицы подписи
    function createSignatureTable(label, positionValue, nameValue) {
        const rows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: label, bold: true, size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: positionValue, size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 23, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: '___________________', size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 23, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: nameValue, size: 24, font: "Times New Roman" })], borders: noBorder, width: { size: 24, type: WidthType.PERCENTAGE } })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: '', size: 18, font: "Times New Roman" })], borders: noBorder }),
                    new TableCell({ children: [new Paragraph({ text: '(должность)', size: 18, color: "555555", font: "Times New Roman" })], borders: noBorder }),
                    new TableCell({ children: [new Paragraph({ text: '(подпись)', size: 18, color: "555555", font: "Times New Roman" })], borders: noBorder }),
                    new TableCell({ children: [new Paragraph({ text: '(расшифровка подписи)', size: 18, color: "555555", font: "Times New Roman" })], borders: noBorder })
                ]
            })
        ];
        return new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorder });
    }
    
    // Председатель комиссии
    children.push(createSignatureTable('Председатель комиссии:', commissionChairmanPosition, commissionChairmanName));
    children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    
    // Члены комиссии
    if (commissionMembersList.length > 0) {
        commissionMembersList.forEach((member, idx) => {
            let memberName = member;
            let memberPosition = '';
            if (typeof member === 'string') {
                const match = member.match(/^(.*?)\s*\((.+?)\)$/);
                if (match) {
                    memberName = match[1].trim();
                    memberPosition = match[2].trim();
                }
            }
            if (!memberName) memberName = '___________________';
            if (!memberPosition) memberPosition = '___________________';
            
            children.push(createSignatureTable(idx === 0 ? 'Члены комиссии:' : '', memberPosition, memberName));
            children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
        });
    } else {
        children.push(createSignatureTable('Члены комиссии:', '___________________', '___________________'));
        children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    }
    
    // Материально ответственное лицо
    children.push(createSignatureTable('Материально ответственное лицо:', responsiblePersonPosition, responsiblePersonName));
    children.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman" }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,
                        bottom: 1440,
                        left: 1440,
                        right: 720
                    }
                }
            },
            children: children
        }]
    });
    
    return await Packer.toBuffer(doc);
}

// Эндпоинт получения договоров по заявке (без JSON операций, чтобы избежать ошибок)
app.get('/api/shipment-requests/:id/contracts', verifyToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        
        console.log(`🔍 Поиск договора для заявки ID: ${requestId}`);
        
        const result = await dbPool.request()
            .input('request_id', sql.Int, requestId)
            .query(`
                SELECT 
                    c.id,
                    c.contract_number,
                    c.request_id,
                    s.request_number,
                    s.customer_name,
                    s.customer_unp,
                    s.customer_address,
                    s.customer_contact,
                    c.contract_date,
                    c.valid_until,
                    c.status,
                    CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
                    c.created_at,
                    c.signed_by_customer,
                    c.signed_by_manager,
                    c.signed_at,
                    c.notes,
                    c.contract_data,
                    c.seller_legal_address,
                    c.seller_bank_account,
                    c.seller_bank_name,
                    c.seller_bank_code,
                    c.buyer_legal_address,
                    c.buyer_bank_account,
                    c.buyer_bank_name,
                    c.buyer_bank_code
                FROM tbl_Contracts c
                LEFT JOIN tbl_ShipmentRequests s ON c.request_id = s.id
                LEFT JOIN tbl_Users u1 ON c.created_by = u1.id
                WHERE c.request_id = @request_id
            `);
        
        console.log(`📊 Найдено договоров: ${result.recordset.length}`);
        
        const contracts = result.recordset.map(contract => {
            let orderAmount = 0;
            if (contract.contract_data && typeof contract.contract_data === 'string') {
                try {
                    const match = contract.contract_data.match(/"total_amount":(\d+(?:\.\d+)?)/);
                    if (match) {
                        orderAmount = parseFloat(match[1]);
                    }
                } catch (e) {
                    console.error('Ошибка парсинга contract_data:', e);
                }
            }
            return {
                ...contract,
                order_amount: orderAmount
            };
        });
        
        res.json({
            success: true,
            contracts: contracts
        });
        
    } catch (error) {
        console.error('Ошибка получения договоров:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения договоров: ' + error.message
        });
    }
});
// Эндпоинт получения договора по ID
app.get('/api/contracts/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        const contractId = req.params.id;
        
        console.log(`🔍 Поиск договора с ID: ${contractId}`);
        
        const result = await dbPool.request()
    .input('id', sql.Int, contractId)
    .query(`
        SELECT 
            c.id,
            c.contract_number,
            c.request_id,
            s.request_number,
            s.customer_name,
            s.customer_unp,
            s.customer_address,
            s.customer_contact,
            s.customer_phone,
            s.customer_director,
            s.required_date,
            s.vehicle_number,
            CONCAT(s.driver_last_name, ' ', s.driver_first_name, ISNULL(' ' + s.driver_middle_name, '')) as driver_name,
            s.shipping_date,
            s.need_vehicle,
            c.contract_date,
            c.valid_until,
            c.status,
            CONCAT(u1.last_name, ' ', u1.first_name, ISNULL(' ' + u1.middle_name, '')) as created_by_name,
            c.created_at,
            c.signed_by_customer,
            c.signed_by_manager,
            c.signed_at,
            c.notes,
            c.contract_data,
            c.seller_legal_address,
            c.seller_bank_account,
            c.seller_bank_name,
            c.seller_bank_code,
            c.buyer_legal_address,
            c.buyer_bank_account,
            c.buyer_bank_name,
            c.buyer_bank_code
        FROM tbl_Contracts c
        LEFT JOIN tbl_ShipmentRequests s ON c.request_id = s.id
        LEFT JOIN tbl_Users u1 ON c.created_by = u1.id
        WHERE c.id = @id
    `);
        
        console.log(`📊 Найдено записей: ${result.recordset.length}`);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Договор не найден'
            });
        }
        
        const contract = result.recordset[0];
        
        // Парсим contract_data безопасно
        let orderAmount = 0;
        if (contract.contract_data && typeof contract.contract_data === 'string') {
            try {
                const match = contract.contract_data.match(/"total_amount":(\d+(?:\.\d+)?)/);
                if (match) {
                    orderAmount = parseFloat(match[1]);
                }
            } catch (e) {
                console.error('Ошибка парсинга contract_data:', e);
            }
        }
        
        contract.order_amount = orderAmount;
        
        res.json({
            success: true,
            contract: contract
        });
        
    } catch (error) {
        console.error('Ошибка получения договора:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения договора: ' + error.message
        });
    }
});
// 56. ЭКСПОРТ ДОГОВОРА
app.get('/api/contracts/:id/export', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещен'
            });
        }
        
        const contractId = req.params.id;
        const format = req.query.format || 'pdf';
        
        console.log(`📄 Экспорт договора ID: ${contractId}, формат: ${format}`);
        
        // Получаем данные договора
        const result = await dbPool.request()
    .input('id', sql.Int, contractId)
    .query(`
        SELECT 
            c.*, 
            s.customer_name, 
            s.customer_unp, 
            s.request_number, 
            s.customer_address, 
            s.customer_contact,
            s.customer_phone,
            s.customer_director,
            s.required_date,
            s.vehicle_number, 
            CONCAT(s.driver_last_name, ' ', s.driver_first_name, ISNULL(' ' + s.driver_middle_name, '')) as driver_name,
            s.shipping_date,
            s.need_vehicle
        FROM tbl_Contracts c
        JOIN tbl_ShipmentRequests s ON c.request_id = s.id
        WHERE c.id = @id
    `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Договор не найден'
            });
        }
        
        const contract = result.recordset[0];
        
        const itemsResult = await dbPool.request()
            .input('request_id', sql.Int, contract.request_id)
            .query(`
                SELECT d.name, d.model, i.quantity_requested, i.price_per_unit,
                       (i.quantity_requested * i.price_per_unit) as total
                FROM tbl_ShipmentRequestItems i
                JOIN tbl_Devices d ON i.device_id = d.id
                WHERE i.request_id = @request_id
            `);
        
        const items = itemsResult.recordset;
        
        const safeFileName = `contract_${contract.contract_number}`.replace(/[^\w\-]/g, '_');
        
        // Собираем все данные для договора
        const contractFullData = {
            ...contract,
            customer_phone: contract.customer_phone || '',
            customer_director: contract.customer_director || '',
            items: items
        };
        
        if (format === 'excel') {
    const workbook = XLSX.utils.book_new();
    
    const worksheet_data = [
        ['ДОГОВОР № ' + contract.contract_number],
        [''],
        ['г. Минск', new Date(contract.contract_date).toLocaleDateString('ru-RU')],
        [''],
        ['НПУП «АТОМТЕХ», в лице директора Иванова Ивана Ивановича, действующего на основании Устава, именуемый в дальнейшем Поставщик, с одной стороны, и'],
        [contract.customer_name + ', в лице директора ' + (contract.customer_director || '______________') + ', действующего на основании Устава, именуемый в дальнейшем Покупатель, с другой стороны, заключили настоящий договор о нижеследующем:'],
        [''],
        ['1. Предмет договора. Качество'],
        ['1.1. Поставщик обязуется поставить, а Покупатель принять и оплатить товар. Наименование, ассортимент, количество и цена которого указаны в спецификации (Приложение №1) и товарно-транспортных (товарных) накладных.'],
        ['1.2. Цель приобретения товара – ___________________________________________.'],
        [''],
        ['2. Цена. Порядок расчетов'],
        ['2.1. Цена на товар устанавливается в белорусских рублях и согласовывается сторонами в спецификации. Если товар не был оплачен по действующей спецификации, то по истечении ее срока действия цена на товар может быть изменена Поставщиком в одностороннем порядке.'],
        ['2.2. Общая сумма настоящего договора определяется из сумм указанных в товарно-транспортных (товарных) накладных.'],
        ['2.3. Порядок оплаты – 100% предоплата.'],
        [''],
        ['3. Сроки. Порядок поставки и приёмки товара по качеству и количеству.'],
        ['3.1. Поставка товара осуществляется в полном объёме либо частями, в сроки указанные в спецификации.'],
        ['3.2. Вывоз продукции осуществляется силами Покупателя со склада Поставщика, расположенного по адресу: г. Минск, ул. Гикало, д. 5. По предварительной договорённости возможна доставка силами поставщика.'],
        ['3.3. Моментом поставки товара Поставщиком по настоящему договору считается момент подписания товарно-транспортных накладных уполномоченным представителем Покупателя. Все риски связанные с дальнейшей судьбой товара переходят на Покупателя в момент непосредственной передачи товара во владение уполномоченному представителю Покупателя.'],
        ['3.4. Приемка товара по количеству и качеству, уполномоченным представителем Покупателя подтверждается путём подписанием товарно-транспортных накладных уполномоченным представителем Покупателя.'],
        ['3.5. Претензии Покупателя к качеству товара по истечении 30-ти дней после приёмки товара не принимаются, это же время даётся на выявление скрытых дефектов. Забракованный Покупателем товар подлежит возврату Поставщику в надлежащем виде. Некачественный товар должен быть заменен Поставщиком на товар надлежащего качества. Поставщик имеет право перепроверки забракованного товара.'],
        [''],
        ['4. Ответственность сторон.'],
        ['4.1. За просрочку поставки Товара по вине Поставщика, последний уплачивает Покупателю за каждый день просрочки пеню в размере 0,2% от стоимости просроченного к поставке Товара.'],
        ['4.2. За просрочку оплаты по п.2.3. настоящего договора, Покупатель уплачивает Поставщику за каждый день просрочки пеню в размере 0,2% от стоимости неоплаченного Товара.'],
        ['4.3. Поставщик вправе отказаться от поставки последующей, согласованной Сторонами партии Товара, до оплаты в полном размере предыдущей партии Товара.'],
        ['4.4. Если вследствие несоблюдения Покупателем пункта 5.2. настоящего договора, к Поставщику будут применены меры административной и иной ответственности, Покупатель обязан возместить в полном объеме сумму штрафа и убытки, причиненные по указанной причине.'],
        ['4.5. «Поставщик несет ответственность за ненадлежащее исполнение обязанности по направлению электронного счета-фактуры по НДС на портал электронных счетов-фактур».'],
        [''],
        ['5. Дополнительные условия'],
        ['5.1. Договор вступает в силу с момента его подписания Сторонами и действует по 31.12.2026 года, но в любом случае до полного исполнения сторонами своих обязательств. В этом случае, если не одна из сторон, за 1 (один) месяц до истечения срока действия настоящего договора не известит другую Сторону о его прекращении, настоящий договор пролонгируется на каждый последующий календарный год на прежних условиях. Настоящий договор заключён в 2-х экземплярах по одному для каждой стороны.'],
        ['5.2. Покупатель гарантирует, что товары, приобретаемые в рамках настоящего договора не будут использоваться при строительстве объектов, финансируемых полностью или частично за счет средств республиканского и (или) местных бюджетов, в том числе государственных целевых бюджетных фондов, а также государственных внебюджетных фондов, внешних государственных займов и внешних займов, привлеченных под гарантии Правительства Республики Беларусь, кредитов банков Республики Беларусь под гарантии Правительства Республики Беларусь и областных, Минского городского исполнительных комитетов, при строительстве жилых домов (за исключением финансируемых с использованием средств иностранных инвесторов), а также автомобильных дорог, мостов и тоннелей.'],
        ['5.3. Стороны признают юридическую силу документов переданных по факсимильной связи, при условии последующего их подтверждения оригинальными документами.'],
        ['5.4. В соответствии с п.2 ст.161 ГК РБ стороны пришли к соглашению о возможности использовать руководителем или уполномоченным лицом факсимильного воспроизведения подписи с помощью средств механического или иного копирования, электронно-цифровой подписи в товарных и товарно-транспортных накладных.'],
        ['5.5. Споры по настоящему договору Стороны разрешают путём переговоров. В случае не достижения согласия Сторонами спор разрешается в судебном порядке в соответствии с законодательством Республики Беларусь.'],
        [''],
        ['6. Юридические адреса и реквизиты сторон'],
        [''],
        ['ПОСТАВЩИК:'],
        ['  Полное наименование:', 'НПУП «АТОМТЕХ»'],
        ['  Юридический адрес:', 'г. Минск, ул. Гикало, д. 5'],
        ['  УНП:', '332279933'],
        ['  Расчетный счет:', 'BY13BELA30120000000000000000'],
        ['  Банк:', 'ОАО "АСБ Беларусбанк"'],
        ['  Код банка (БИК):', 'BAPBBY2X'],
        ['  Телефон:', '+375172123456'],
        ['  Директор:', 'Иванов Иван Иванович'],
        [''],
        ['ПОКУПАТЕЛЬ:'],
        ['  Полное наименование:', contract.customer_name || '______________'],
        ['  Юридический адрес:', contract.buyer_legal_address || contract.customer_address || '______________'],
        ['  УНП:', contract.customer_unp || '______________'],
        ['  Расчетный счет:', contract.buyer_bank_account || '______________'],
        ['  Банк:', contract.buyer_bank_name || '______________'],
        ['  Код банка (БИК):', contract.buyer_bank_code || '______________'],
        ['  Телефон:', contract.customer_phone || '______________'],
        ['  Директор:', contract.customer_director || '______________'],
        ['  Контактное лицо:', contract.customer_contact || '______________'],
        [''],
        ['СПЕЦИФИКАЦИЯ (Приложение №1)'],
        [''],
        ['№ п/п', 'Наименование товара', 'Модель', 'Количество', 'Цена (руб.)', 'Сумма (руб.)']
    ];
    
    let totalAmount = 0;
    items.forEach((item, index) => {
        const sum = item.quantity_requested * item.price_per_unit;
        totalAmount += sum;
        worksheet_data.push([
            (index + 1).toString(),
            item.name,
            item.model || '-',
            item.quantity_requested,
            item.price_per_unit.toFixed(2),
            sum.toFixed(2)
        ]);
    });
    
    worksheet_data.push(['', '', '', '', 'ИТОГО:', totalAmount.toFixed(2)]);
    worksheet_data.push(['']);
    worksheet_data.push(['ПОДПИСИ СТОРОН:']);
    worksheet_data.push(['']);
    worksheet_data.push(['Поставщик:', '', 'Покупатель:']);
    worksheet_data.push(['_____________________', '', '_____________________']);
    worksheet_data.push(['М.П.', '', 'М.П.']);
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
    
    // Настройка ширины колонок
    worksheet['!cols'] = [
        { wch: 25 },  
        { wch: 50 }   
    ];
    
    // Объединение ячеек
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 0 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
        { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
        { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },
        { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
        { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
        { s: { r: 12, c: 0 }, e: { r: 12, c: 1 } },
        { s: { r: 13, c: 0 }, e: { r: 13, c: 1 } },
        { s: { r: 14, c: 0 }, e: { r: 14, c: 1 } },
        { s: { r: 16, c: 0 }, e: { r: 16, c: 1 } },
        { s: { r: 17, c: 0 }, e: { r: 17, c: 1 } },
        { s: { r: 18, c: 0 }, e: { r: 18, c: 1 } },
        { s: { r: 19, c: 0 }, e: { r: 19, c: 1 } },
        { s: { r: 20, c: 0 }, e: { r: 20, c: 1 } },
        { s: { r: 21, c: 0 }, e: { r: 21, c: 1 } },
        { s: { r: 23, c: 0 }, e: { r: 23, c: 1 } },
        { s: { r: 24, c: 0 }, e: { r: 24, c: 1 } },
        { s: { r: 25, c: 0 }, e: { r: 25, c: 1 } },
        { s: { r: 26, c: 0 }, e: { r: 26, c: 1 } },
        { s: { r: 27, c: 0 }, e: { r: 27, c: 1 } },
        { s: { r: 28, c: 0 }, e: { r: 28, c: 1 } },
        { s: { r: 30, c: 0 }, e: { r: 30, c: 1 } },
        { s: { r: 31, c: 0 }, e: { r: 31, c: 1 } },
        { s: { r: 32, c: 0 }, e: { r: 32, c: 1 } },
        { s: { r: 33, c: 0 }, e: { r: 33, c: 1 } },
        { s: { r: 34, c: 0 }, e: { r: 34, c: 1 } },
        { s: { r: 35, c: 0 }, e: { r: 35, c: 1 } },
        { s: { r: 36, c: 0 }, e: { r: 36, c: 1 } },
        { s: { r: 38, c: 0 }, e: { r: 38, c: 1 } },
        { s: { r: 56, c: 0 }, e: { r: 56, c: 1 } },  // Заголовок спецификации
        { s: { r: 62, c: 0 }, e: { r: 62, c: 1 } },  // Заголовок подписей
        { s: { r: 64, c: 0 }, e: { r: 64, c: 0 } },  // Поставщик
        { s: { r: 64, c: 2 }, e: { r: 64, c: 2 } },  // Покупатель
        { s: { r: 65, c: 0 }, e: { r: 65, c: 0 } },  // Подпись поставщика
        { s: { r: 65, c: 2 }, e: { r: 65, c: 2 } },  // Подпись покупателя
        { s: { r: 66, c: 0 }, e: { r: 66, c: 0 } },  // МП поставщика
        { s: { r: 66, c: 2 }, e: { r: 66, c: 2 } }   // МП покупателя
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Договор');
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.xlsx"`);
    res.send(excelBuffer);
} else if (format === 'docx') {
            // Word экспорт
            const docxBuffer = await generateContractDocx(contractFullData, items);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.docx"`);
            res.send(docxBuffer);
            
        } else if (format === 'html') {
            const html = generateContractHtml(contractFullData, items);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `inline; filename="${safeFileName}.html"`);
            res.send(html);
            
        } else {
            res.status(400).json({ success: false, message: 'Неподдерживаемый формат' });
        }
        
    } catch (error) {
        console.error('Ошибка экспорта договора:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка экспорта договора: ' + error.message
        });
    }
});

function generateContractHtml(contract, items) {
let date = '';
if (contract.contract_date) {
    const d = new Date(contract.contract_date);
    date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    const d = new Date();
    date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}    
    // Функция для безопасного экранирования HTML (кавычки НЕ заменяются на &quot;)
    function escapeHtmlSafe(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        // Кавычки " и ' остаются как есть
    }
    
    let itemsHtml = '';
    if (items && items.length > 0) {
        items.forEach((item, index) => {
            itemsHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</noscript>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtmlSafe(item.name)} ${escapeHtmlSafe(item.model || '')}</noscript>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity_requested}</noscript>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${item.price_per_unit.toFixed(2)} руб.</noscript>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${(item.quantity_requested * item.price_per_unit).toFixed(2)} руб.</noscript>
            </tr>
            `;
        });
    }
    
    const totalAmount = items ? items.reduce((sum, item) => sum + (item.quantity_requested * item.price_per_unit), 0) : 0;
    
    // Дата окончания договора (фиксированная)
    const validUntil = '31.12.2026';
    
    const sellerLegalAddress = contract.seller_legal_address || 'г. Минск, ул. Гикало, д. 5';
    const sellerBankAccount = contract.seller_bank_account || 'BY13BELA30120000000000000000';
    const sellerBankName = contract.seller_bank_name || 'ОАО "АСБ Беларусбанк"';
    const sellerBankCode = contract.seller_bank_code || 'BAPBBY2X';
    const sellerUnp = '332279933';
    const sellerDirector = 'Иванов Иван Иванович';
    const sellerPhone = '+375172123456';
    
    // Реквизиты покупателя (из заявки)
    const buyerName = contract.customer_name || '______________';
    const buyerLegalAddress = contract.buyer_legal_address || contract.customer_address || '______________';
    const buyerUnp = contract.customer_unp || '______________';
    const buyerBankAccount = contract.buyer_bank_account || '______________';
    const buyerBankName = contract.buyer_bank_name || '______________';
    const buyerBankCode = contract.buyer_bank_code || '______________';
    const buyerPhone = contract.customer_phone || '______________';
    const buyerDirector = contract.customer_director || '______________';
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Договор № ${contract.contract_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            margin: 20mm;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 14pt;
            font-weight: bold;
            margin: 5px 0;
        }
        .header .date {
            margin-top: 10px;
        }
        .section-title {
            font-weight: bold;
            margin: 15px 0 5px 0;
            font-size: 12pt;
        }
        .requisites-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .requisites-table td {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
        }
        .requisites-table td:first-child {
            width: 35%;
            font-weight: bold;
            background-color: #f5f5f5;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            gap: 30px;
        }
        .party {
            width: 48%;
        }
        .party-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            font-size: 13pt;
            background-color: #e8e8e8;
            padding: 5px;
        }
        .party-signature {
            margin-top: 30px;
        }
        .stamp {
            margin-top: 10px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .items-table th,
        .items-table td {
            border: 1px solid #000;
            padding: 6px;
        }
        .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        hr {
            margin: 15px 0;
        }
        p {
            margin: 5px 0;
            text-align: justify;
        }
    </style>
</head>
<body>

<div class="header">
    <h1>ДОГОВОР № ${contract.contract_number}</h1>
    <div class="date">${date}</div>
</div>

<p><strong>НПУП «АТОМТЕХ»</strong>, в лице директора ${escapeHtmlSafe(sellerDirector)}, действующего на основании Устава, именуемый в дальнейшем <strong>Поставщик</strong>, с одной стороны, и</p>
<p><strong>${escapeHtmlSafe(buyerName)}</strong>, в лице директора <strong>${escapeHtmlSafe(buyerDirector)}</strong>, действующего на основании Устава, именуемый в дальнейшем <strong>Покупатель</strong>, с другой стороны, заключили настоящий договор о нижеследующем:</p>

<div class="section-title">1. Предмет договора. Качество</div>
<p>1.1. Поставщик обязуется поставить, а Покупатель принять и оплатить товар. Наименование, ассортимент, количество и цена которого указаны в спецификации (Приложение №1) и товарно-транспортных (товарных) накладных.</p>
<p>1.2. Цель приобретения товара – ___________________________________________.</p>

<div class="section-title">2. Цена. Порядок расчетов</div>
<p>2.1. Цена на товар устанавливается в белорусских рублях и согласовывается сторонами в спецификации. Если товар не был оплачен по действующей спецификации, то по истечении ее срока действия цена на товар может быть изменена Поставщиком в одностороннем порядке.</p>
<p>2.2. Общая сумма настоящего договора определяется из сумм указанных в товарно-транспортных (товарных) накладных.</p>
<p>2.3. Порядок оплаты – 100% предоплата.</p>

<div class="section-title">3. Сроки. Порядок поставки и приёмки товара по качеству и количеству.</div>
<p>3.1. Поставка товара осуществляется в полном объёме либо частями, в сроки указанные в спецификации.</p>
<p>3.2. Вывоз продукции осуществляется силами Покупателя со склада Поставщика, расположенного по адресу: г. Минск, ул. Гикало, д. 5. По предварительной договорённости возможна доставка силами поставщика.</p>
<p>3.3. Моментом поставки товара Поставщиком по настоящему договору считается момент подписания товарно-транспортных накладных уполномоченным представителем Покупателя. Все риски связанные с дальнейшей судьбой товара переходят на Покупателя в момент непосредственной передачи товара во владение уполномоченному представителю Покупателя.</p>
<p>3.4. Приемка товара по количеству и качеству, уполномоченным представителем Покупателя подтверждается путём подписанием товарно-транспортных накладных уполномоченным представителем Покупателя.</p>
<p>3.5. Претензии Покупателя к качеству товара по истечении 30-ти дней после приёмки товара не принимаются, это же время даётся на выявление скрытых дефектов. Забракованный Покупателем товар подлежит возврату Поставщику в надлежащем виде. Некачественный товар должен быть заменен Поставщиком на товар надлежащего качества. Поставщик имеет право перепроверки забракованного товара.</p>

<div class="section-title">4. Ответственность сторон.</div>
<p>4.1. За просрочку поставки Товара по вине Поставщика, последний уплачивает Покупателю за каждый день просрочки пеню в размере 0,2% от стоимости просроченного к поставке Товара.</p>
<p>4.2. За просрочку оплаты по п.2.3. настоящего договора, Покупатель уплачивает Поставщику за каждый день просрочки пеню в размере 0,2% от стоимости неоплаченного Товара.</p>
<p>4.3. Поставщик вправе отказаться от поставки последующей, согласованной Сторонами партии Товара, до оплаты в полном размере предыдущей партии Товара.</p>
<p>4.4. Если вследствие несоблюдения Покупателем пункта 5.2. настоящего договора, к Поставщику будут применены меры административной и иной ответственности, Покупатель обязан возместить в полном объеме сумму штрафа и убытки, причиненные по указанной причине.</p>
<p>4.5. «Поставщик несет ответственность за ненадлежащее исполнение обязанности по направлению электронного счета-фактуры по НДС на портал электронных счетов-фактур».</p>

<div class="section-title">5. Дополнительные условия</div>
<p>5.1. Договор вступает в силу с момента его подписания Сторонами и действует по ${validUntil} года, но в любом случае до полного исполнения сторонами своих обязательств. В этом случае, если не одна из сторон, за 1 (один) месяц до истечения срока действия настоящего договора не известит другую Сторону о его прекращении, настоящий договор пролонгируется на каждый последующий календарный год на прежних условиях. Настоящий договор заключён в 2-х экземплярах по одному для каждой стороны.</p>
<p>5.2. Покупатель гарантирует, что товары, приобретаемые в рамках настоящего договора не будут использоваться при строительстве объектов, финансируемых полностью или частично за счет средств республиканского и (или) местных бюджетов, в том числе государственных целевых бюджетных фондов, а также государственных внебюджетных фондов, внешних государственных займов и внешних займов, привлеченных под гарантии Правительства Республики Беларусь, кредитов банков Республики Беларусь под гарантии Правительства Республики Беларусь и областных, Минского городского исполнительных комитетов, при строительстве жилых домов (за исключением финансируемых с использованием средств иностранных инвесторов), а также автомобильных дорог, мостов и тоннелей.</p>
<p>5.3. Стороны признают юридическую силу документов переданных по факсимильной связи, при условии последующего их подтверждения оригинальными документами.</p>
<p>5.4. В соответствии с п.2 ст.161 ГК РБ стороны пришли к соглашению о возможности использовать руководителем или уполномоченным лицом факсимильного воспроизведения подписи с помощью средств механического или иного копирования, электронно-цифровой подписи в товарных и товарно-транспортных накладных.</p>
<p>5.5. Споры по настоящему договору Стороны разрешают путём переговоров. В случае не достижения согласия Сторонами спор разрешается в судебном порядке в соответствии с законодательством Республики Беларусь.</p>

<div class="section-title">6. Юридические адреса и реквизиты сторон</div>

<div class="parties">
    <div class="party">
        <div class="party-title">ПОСТАВЩИК</div>
        <table class="requisites-table">
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Полное наименование:</td><td>НПУП «АТОМТЕХ»</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Юридический адрес:</td><td>${escapeHtmlSafe(sellerLegalAddress)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">УНП:</td><td>${escapeHtmlSafe(sellerUnp)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Расчетный счет:</td><td>${escapeHtmlSafe(sellerBankAccount)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Банк:</td><td>${escapeHtmlSafe(sellerBankName)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Код банка (БИК):</td><td>${escapeHtmlSafe(sellerBankCode)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Телефон:</td><td>${escapeHtmlSafe(sellerPhone)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Директор:</td><td>${escapeHtmlSafe(sellerDirector)}</td></tr>
        </table>
        <div class="party-signature">
            Подпись _____________________<br>
            <div class="stamp">М.П.</div>
        </div>
    </div>
    
    <div class="party">
        <div class="party-title">ПОКУПАТЕЛЬ</div>
        <table class="requisites-table">
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Полное наименование:</td><td>${escapeHtmlSafe(buyerName)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Юридический адрес:</td><td>${escapeHtmlSafe(buyerLegalAddress)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">УНП:</td><td>${escapeHtmlSafe(buyerUnp)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Расчетный счет:</td><td>${escapeHtmlSafe(buyerBankAccount)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Банк:</td><td>${escapeHtmlSafe(buyerBankName)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Код банка (БИК):</td><td>${escapeHtmlSafe(buyerBankCode)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Телефон:</td><td>${escapeHtmlSafe(buyerPhone)}</td></tr>
            <tr><td style="background-color: #f5f5f5; font-weight: bold;">Директор:</td><td>${escapeHtmlSafe(buyerDirector)}</td></tr>
        </table>
        <div class="party-signature">
            Подпись _____________________<br>
            <div class="stamp">М.П.</div>
        </div>
    </div>
</div>

</body>
</html>`;
}

// Функция генерации DOCX договора
async function generateContractDocx(contract, items) {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } = require('docx');
    
let date = '';
if (contract.contract_date) {
    const d = new Date(contract.contract_date);
    date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
} else {
    const d = new Date();
    date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}    const totalAmount = items.reduce((sum, item) => sum + (item.quantity_requested * item.price_per_unit), 0);
    
    // Реквизиты поставщика
    const sellerLegalAddress = contract.seller_legal_address || 'г. Минск, ул. Гикало, д. 5';
    const sellerBankAccount = contract.seller_bank_account || 'BY13BELA30120000000000000000';
    const sellerBankName = contract.seller_bank_name || 'ОАО "АСБ Беларусбанк"';
    const sellerBankCode = contract.seller_bank_code || 'BAPBBY2X';
    const sellerUnp = '332279933';
    const sellerDirector = 'Иванов Иван Иванович';
    const sellerPhone = '+375172123456';
    
    // Реквизиты покупателя
    const buyerName = contract.customer_name || '______________';
    const buyerLegalAddress = contract.buyer_legal_address || contract.customer_address || '______________';
    const buyerUnp = contract.customer_unp || '______________';
    const buyerBankAccount = contract.buyer_bank_account || '______________';
    const buyerBankName = contract.buyer_bank_name || '______________';
    const buyerBankCode = contract.buyer_bank_code || '______________';
    const buyerPhone = contract.customer_phone || '______________';
    const buyerDirector = contract.customer_director || '______________';
    
    const children = [];
    
    // Заголовок
    children.push(new Paragraph({
        text: `ДОГОВОР № ${contract.contract_number}`,
        alignment: AlignmentType.CENTER,
        bold: true,
        size: 32,
        spacing: { after: 200 }
    }));
    
    children.push(new Paragraph({
        text: date,
        alignment: AlignmentType.CENTER,
        size: 24,
        spacing: { after: 400 }
    }));
    
    // Преамбула
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'НПУП «АТОМТЕХ»', bold: true }),
            new TextRun({ text: ', в лице директора ' }),
            new TextRun({ text: sellerDirector, bold: true }),
            new TextRun({ text: ', действующего на основании Устава, именуемый в дальнейшем ' }),
            new TextRun({ text: 'Поставщик', bold: true }),
            new TextRun({ text: ', с одной стороны, и' })
        ],
        spacing: { after: 100 }
    }));
    
    children.push(new Paragraph({
        children: [
            new TextRun({ text: buyerName, bold: true }),
            new TextRun({ text: ', в лице директора ' }),
            new TextRun({ text: buyerDirector, bold: true }),
            new TextRun({ text: ', действующего на основании Устава, именуемый в дальнейшем ' }),
            new TextRun({ text: 'Покупатель', bold: true }),
            new TextRun({ text: ', с другой стороны, заключили настоящий договор о нижеследующем:' })
        ],
        spacing: { after: 300 }
    }));
    
    // Раздел 1
    children.push(new Paragraph({
        text: '1. Предмет договора. Качество',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 }
    }));
    children.push(new Paragraph({
        text: '1.1. Поставщик обязуется поставить, а Покупатель принять и оплатить товар. Наименование, ассортимент, количество и цена которого указаны в спецификации (Приложение №1) и товарно-транспортных (товарных) накладных.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '1.2. Цель приобретения товара – ___________________________________________.',
        spacing: { after: 200 }
    }));
    
    // Раздел 2
    children.push(new Paragraph({
        text: '2. Цена. Порядок расчетов',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 }
    }));
    children.push(new Paragraph({
        text: '2.1. Цена на товар устанавливается в белорусских рублях и согласовывается сторонами в спецификации. Если товар не был оплачен по действующей спецификации, то по истечении ее срока действия цена на товар может быть изменена Поставщиком в одностороннем порядке.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '2.2. Общая сумма настоящего договора определяется из сумм указанных в товарно-транспортных (товарных) накладных.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '2.3. Порядок оплаты – 100% предоплата.',
        spacing: { after: 200 }
    }));
    
    // Раздел 3
    children.push(new Paragraph({
        text: '3. Сроки. Порядок поставки и приёмки товара по качеству и количеству.',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 }
    }));
    children.push(new Paragraph({
        text: '3.1. Поставка товара осуществляется в полном объёме либо частями, в сроки указанные в спецификации.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '3.2. Вывоз продукции осуществляется силами Покупателя со склада Поставщика, расположенного по адресу: г. Минск, ул. Гикало, д. 5. По предварительной договорённости возможна доставка силами поставщика.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '3.3. Моментом поставки товара Поставщиком по настоящему договору считается момент подписания товарно-транспортных накладных уполномоченным представителем Покупателя. Все риски связанные с дальнейшей судьбой товара переходят на Покупателя в момент непосредственной передачи товара во владение уполномоченному представителю Покупателя.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '3.4. Приемка товара по количеству и качеству, уполномоченным представителем Покупателя подтверждается путём подписанием товарно-транспортных накладных уполномоченным представителем Покупателя.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '3.5. Претензии Покупателя к качеству товара по истечении 30-ти дней после приёмки товара не принимаются, это же время даётся на выявление скрытых дефектов. Забракованный Покупателем товар подлежит возврату Поставщику в надлежащем виде. Некачественный товар должен быть заменен Поставщиком на товар надлежащего качества. Поставщик имеет право перепроверки забракованного товара.',
        spacing: { after: 200 }
    }));
    
    // Раздел 4
    children.push(new Paragraph({
        text: '4. Ответственность сторон.',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 }
    }));
    children.push(new Paragraph({
        text: '4.1. За просрочку поставки Товара по вине Поставщика, последний уплачивает Покупателю за каждый день просрочки пеню в размере 0,2% от стоимости просроченного к поставке Товара.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '4.2. За просрочку оплаты по п.2.3. настоящего договора, Покупатель уплачивает Поставщику за каждый день просрочки пеню в размере 0,2% от стоимости неоплаченного Товара.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '4.3. Поставщик вправе отказаться от поставки последующей, согласованной Сторонами партии Товара, до оплаты в полном размере предыдущей партии Товара.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '4.4. Если вследствие несоблюдения Покупателем пункта 5.2. настоящего договора, к Поставщику будут применены меры административной и иной ответственности, Покупатель обязан возместить в полном объеме сумму штрафа и убытки, причиненные по указанной причине.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '4.5. «Поставщик несет ответственность за ненадлежащее исполнение обязанности по направлению электронного счета-фактуры по НДС на портал электронных счетов-фактур».',
        spacing: { after: 200 }
    }));
    
    // Раздел 5
    children.push(new Paragraph({
        text: '5. Дополнительные условия',
        bold: true,
        size: 24,
        spacing: { before: 200, after: 100 }
    }));
    children.push(new Paragraph({
        text: '5.1. Договор вступает в силу с момента его подписания Сторонами и действует по 31.12.2026 года, но в любом случае до полного исполнения сторонами своих обязательств. В этом случае, если не одна из сторон, за 1 (один) месяц до истечения срока действия настоящего договора не известит другую Сторону о его прекращении, настоящий договор пролонгируется на каждый последующий календарный год на прежних условиях. Настоящий договор заключён в 2-х экземплярах по одному для каждой стороны.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '5.2. Покупатель гарантирует, что товары, приобретаемые в рамках настоящего договора не будут использоваться при строительстве объектов, финансируемых полностью или частично за счет средств республиканского и (или) местных бюджетов, в том числе государственных целевых бюджетных фондов, а также государственных внебюджетных фондов, внешних государственных займов и внешних займов, привлеченных под гарантии Правительства Республики Беларусь, кредитов банков Республики Беларусь под гарантии Правительства Республики Беларусь и областных, Минского городского исполнительных комитетов, при строительстве жилых домов (за исключением финансируемых с использованием средств иностранных инвесторов), а также автомобильных дорог, мостов и тоннелей.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '5.3. Стороны признают юридическую силу документов переданных по факсимильной связи, при условии последующего их подтверждения оригинальными документами.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '5.4. В соответствии с п.2 ст.161 ГК РБ стороны пришли к соглашению о возможности использовать руководителем или уполномоченным лицом факсимильного воспроизведения подписи с помощью средств механического или иного копирования, электронно-цифровой подписи в товарных и товарно-транспортных накладных.',
        spacing: { after: 100 }
    }));
    children.push(new Paragraph({
        text: '5.5. Споры по настоящему договору Стороны разрешают путём переговоров. В случае не достижения согласия Сторонами спор разрешается в судебном порядке в соответствии с законодательством Республики Беларусь.',
        spacing: { after: 300 }
    }));
    
    // Раздел 6 - Юридические адреса и реквизиты сторон
    children.push(new Paragraph({
        text: '6. Юридические адреса и реквизиты сторон',
        bold: true,
        size: 24,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 }
    }));
    
    // Таблица реквизитов - Поставщик
    children.push(new Paragraph({
        text: 'ПОСТАВЩИК',
        bold: true,
        alignment: AlignmentType.CENTER,
        size: 24,
        spacing: { after: 100 }
    }));
    
    const sellerRows = [
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Полное наименование:')] }), new TableCell({ children: [new Paragraph('НПУП «АТОМТЕХ»')] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Юридический адрес:')] }), new TableCell({ children: [new Paragraph(sellerLegalAddress)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('УНП:')] }), new TableCell({ children: [new Paragraph(sellerUnp)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Расчетный счет:')] }), new TableCell({ children: [new Paragraph(sellerBankAccount)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Банк:')] }), new TableCell({ children: [new Paragraph(sellerBankName)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Код банка (БИК):')] }), new TableCell({ children: [new Paragraph(sellerBankCode)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Телефон:')] }), new TableCell({ children: [new Paragraph(sellerPhone)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Директор:')] }), new TableCell({ children: [new Paragraph(sellerDirector)] })] })
    ];
    
    const sellerTable = new Table({ rows: sellerRows, width: { size: 100, type: WidthType.PERCENTAGE } });
    children.push(sellerTable);
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    
    // Таблица реквизитов - Покупатель
    children.push(new Paragraph({
        text: 'ПОКУПАТЕЛЬ',
        bold: true,
        alignment: AlignmentType.CENTER,
        size: 24,
        spacing: { after: 100 }
    }));
    
    const buyerRows = [
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Полное наименование:')] }), new TableCell({ children: [new Paragraph(buyerName)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Юридический адрес:')] }), new TableCell({ children: [new Paragraph(buyerLegalAddress)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('УНП:')] }), new TableCell({ children: [new Paragraph(buyerUnp)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Расчетный счет:')] }), new TableCell({ children: [new Paragraph(buyerBankAccount)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Банк:')] }), new TableCell({ children: [new Paragraph(buyerBankName)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Код банка (БИК):')] }), new TableCell({ children: [new Paragraph(buyerBankCode)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Телефон:')] }), new TableCell({ children: [new Paragraph(buyerPhone)] })] }),
        new TableRow({ children: [new TableCell({ children: [new Paragraph('Директор:')] }), new TableCell({ children: [new Paragraph(buyerDirector)] })] })
    ];
    
    const buyerTable = new Table({ rows: buyerRows, width: { size: 100, type: WidthType.PERCENTAGE } });
    children.push(buyerTable);
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    
    // Подписи
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Подпись Поставщика: _____________________', bold: true }),
            new TextRun({ text: '          ' }),
            new TextRun({ text: 'Подпись Покупателя: _____________________', bold: true })
        ],
        spacing: { after: 50 }
    }));
    
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'М.П.', bold: true }),
            new TextRun({ text: '                                   ' }),
            new TextRun({ text: 'М.П.', bold: true })
        ]
    }));
    
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman" }
                }
            }
        },
        sections: [{
            properties: {},
            children: children
        }]
    });
    
    return await Packer.toBuffer(doc);
}
// Вспомогательная функция для преобразования числа в пропись
function numberToWords(num) {
    if (num === 0) return 'ноль';
    
    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const unitsFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const tens = ['', 'десять', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    
    function convertHundreds(n, isFemale = false) {
        const arr = isFemale ? unitsFemale : units;
        let result = '';
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        
        if (h > 0) result += hundreds[h] + ' ';
        if (t === 1) {
            result += teens[u] + ' ';
        } else {
            if (t > 1) result += tens[t] + ' ';
            if (u > 0) result += arr[u] + ' ';
        }
        return result.trim();
    }
    
    function convertNumber(n) {
        let result = '';
        const millions = Math.floor(n / 1000000);
        const thousands = Math.floor((n % 1000000) / 1000);
        const rest = n % 1000;
        
        if (millions > 0) {
            result += convertHundreds(millions) + ' ';
            const lastDigit = millions % 10;
            const lastTwo = millions % 100;
            if (lastTwo >= 11 && lastTwo <= 19) result += 'миллионов ';
            else if (lastDigit === 1) result += 'миллион ';
            else if (lastDigit >= 2 && lastDigit <= 4) result += 'миллиона ';
            else result += 'миллионов ';
        }
        
        if (thousands > 0) {
            result += convertHundreds(thousands, true) + ' ';
            const lastDigit = thousands % 10;
            const lastTwo = thousands % 100;
            if (lastTwo >= 11 && lastTwo <= 19) result += 'тысяч ';
            else if (lastDigit === 1) result += 'тысяча ';
            else if (lastDigit >= 2 && lastDigit <= 4) result += 'тысячи ';
            else result += 'тысяч ';
        }
        
        if (rest > 0) {
            result += convertHundreds(rest);
        }
        return result.trim();
    }
    
    return convertNumber(Math.floor(num));
}

app.post('/api/devices/:deviceId/images', verifyToken, upload.single('file'), async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const { imageType = 'gallery', description = '' } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Файл не загружен'
            });
        }
        
        // Проверяем существование прибора
        const deviceCheck = await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .query('SELECT id FROM tbl_Devices WHERE id = @deviceId AND status = \'active\'');
        
        if (deviceCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Прибор не найден'
            });
        }
        
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        const isPDF = fileExt === '.pdf';
        
        // Логика определения типа файла
        if (imageType === 'prospect') {
            // Рекламный проспект - только PDF
            if (!isPDF) {
                return res.status(400).json({
                    success: false,
                    message: 'Рекламный проспект должен быть в формате PDF'
                });
            }
            
            // Удаляем старый проспект, если есть
            await dbPool.request()
                .input('deviceId', sql.Int, deviceId)
                .query(`UPDATE tbl_DeviceImages SET is_active = 0 WHERE device_id = @deviceId AND image_type = 'prospect_pdf'`);
            
            // Сохраняем новый проспект
            await dbPool.request()
                .input('deviceId', sql.Int, deviceId)
                .input('pdfData', sql.VarBinary, req.file.buffer)
                .input('imageName', sql.NVarChar, req.file.originalname)
                .input('imageType', sql.NVarChar, 'prospect_pdf')
                .input('fileExtension', sql.NVarChar, fileExt)
                .input('description', sql.NVarChar, description)
                .input('uploadedBy', sql.Int, req.user.id)
                .query(`
                    INSERT INTO tbl_DeviceImages (device_id, pdf_data, image_name, image_type, file_extension, description, uploaded_by, uploaded_at, is_active)
                    VALUES (@deviceId, @pdfData, @imageName, @imageType, @fileExtension, @description, @uploadedBy, CAST(GETDATE() AS DATE), 1)
                `);
            
            res.json({
                success: true,
                message: 'Рекламный проспект успешно загружен'
            });
            
        } else if (imageType === 'gallery') {
            // Галерея - только изображения
            if (isPDF) {
                return res.status(400).json({
                    success: false,
                    message: 'В галерею можно загружать только изображения (JPG, PNG, GIF, WEBP)'
                });
            }
            
            // Сохраняем изображение в галерею
            await dbPool.request()
                .input('deviceId', sql.Int, deviceId)
                .input('imageData', sql.VarBinary, req.file.buffer)
                .input('imageName', sql.NVarChar, req.file.originalname)
                .input('imageType', sql.NVarChar, 'gallery')
                .input('fileExtension', sql.NVarChar, fileExt)
                .input('description', sql.NVarChar, description)
                .input('uploadedBy', sql.Int, req.user.id)
                .query(`
                    INSERT INTO tbl_DeviceImages (device_id, image_data, image_name, image_type, file_extension, description, uploaded_by, uploaded_at, is_active)
                    VALUES (@deviceId, @imageData, @imageName, @imageType, @fileExtension, @description, @uploadedBy, CAST(GETDATE() AS DATE), 1)
                `);
            
            res.json({
                success: true,
                message: 'Изображение успешно добавлено в галерею'
            });
            
        } else if (imageType === 'main') {
            // Главное фото - только изображения
            if (isPDF) {
                return res.status(400).json({
                    success: false,
                    message: 'Главное фото должно быть изображением'
                });
            }
            
            // Удаляем старое главное фото
            await dbPool.request()
                .input('deviceId', sql.Int, deviceId)
                .query(`UPDATE tbl_DeviceImages SET is_active = 0 WHERE device_id = @deviceId AND image_type = 'main'`);
            
            // Сохраняем новое главное фото
            await dbPool.request()
                .input('deviceId', sql.Int, deviceId)
                .input('imageData', sql.VarBinary, req.file.buffer)
                .input('imageName', sql.NVarChar, req.file.originalname)
                .input('imageType', sql.NVarChar, 'main')
                .input('fileExtension', sql.NVarChar, fileExt)
                .input('description', sql.NVarChar, description)
                .input('uploadedBy', sql.Int, req.user.id)
                .query(`
                    INSERT INTO tbl_DeviceImages (device_id, image_data, image_name, image_type, file_extension, description, uploaded_by, uploaded_at, is_active)
                    VALUES (@deviceId, @imageData, @imageName, @imageType, @fileExtension, @description, @uploadedBy, CAST(GETDATE() AS DATE), 1)
                `);
            
            res.json({
                success: true,
                message: 'Главное фото успешно обновлено'
            });
        }
        
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка загрузки файла: ' + error.message
        });
    }
});

// 58. ПОЛУЧЕНИЕ СПИСКА ФАЙЛОВ ПРИБОРА
app.get('/api/devices/:deviceId/images', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('deviceId', sql.Int, req.params.deviceId)
            .query(`
                SELECT 
                    id,
                    image_name,
                    image_type,
                    description,
                    uploaded_at,
                    file_extension,
                    CASE 
                        WHEN image_type = 'prospect_pdf' OR file_extension = '.pdf' THEN 1
                        ELSE 0
                    END as is_pdf,
                    CASE image_type
                        WHEN 'main' THEN 'Главное фото'
                        WHEN 'prospect' THEN 'Фото для проспекта'
                        WHEN 'prospect_pdf' THEN 'Рекламный проспект (PDF)'
                        ELSE 'Фото галереи'
                    END as type_name
                FROM tbl_DeviceImages
                WHERE device_id = @deviceId AND is_active = 1
                ORDER BY 
                    CASE image_type 
                        WHEN 'main' THEN 1
                        WHEN 'prospect' THEN 2
                        WHEN 'prospect_pdf' THEN 3
                        ELSE 4
                    END,
                    uploaded_at DESC
            `);
        
        res.json({
            success: true,
            images: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения файлов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения файлов'
        });
    }
});

// 59. ПОЛУЧЕНИЕ ФАЙЛА (ИЗОБРАЖЕНИЕ ИЛИ PDF)
app.get('/api/images/:imageId', async (req, res) => {
    try {
        const result = await dbPool.request()
            .input('imageId', sql.Int, req.params.imageId)
            .query('SELECT image_data, pdf_data, image_name, file_extension, image_type FROM tbl_DeviceImages WHERE id = @imageId AND is_active = 1');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Файл не найден'
            });
        }
        
        const file = result.recordset[0];
        
        if (file.pdf_data) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${file.image_name}"`);
            res.send(file.pdf_data);
        } else if (file.image_data) {
            const ext = path.extname(file.image_name).toLowerCase();
            const contentType = ext === '.png' ? 'image/png' : 
                              ext === '.gif' ? 'image/gif' : 
                              ext === '.webp' ? 'image/webp' : 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.send(file.image_data);
        } else {
            res.status(404).json({
                success: false,
                message: 'Файл поврежден'
            });
        }
        
    } catch (error) {
        console.error('Ошибка получения файла:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения файла'
        });
    }
});

// 60. УДАЛЕНИЕ ФАЙЛА
app.delete('/api/images/:imageId', verifyToken, async (req, res) => {
    try {
        await dbPool.request()
            .input('imageId', sql.Int, req.params.imageId)
            .query('UPDATE tbl_DeviceImages SET is_active = 0 WHERE id = @imageId');
        
        res.json({
            success: true,
            message: 'Файл удален'
        });
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления файла'
        });
    }
});

// 61. ГАЛЕРЕЯ С ПАГИНАЦИЕЙ
app.get('/api/devices/:deviceId/gallery', verifyToken, async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const result = await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT 
                    id,
                    image_name,
                    image_type,
                    CASE 
                        WHEN image_type = 'prospect_pdf' THEN 'Рекламный проспект (PDF)'
                        WHEN image_type = 'main' THEN 'Главное фото'
                        WHEN image_type = 'prospect' THEN 'Фото для проспекта'
                        ELSE 'Фото галереи'
                    END as type_name,
                    description,
                    uploaded_at,
                    file_extension,
                    CASE 
                        WHEN image_type = 'prospect_pdf' OR file_extension = '.pdf' THEN 1
                        ELSE 0
                    END as is_pdf,
                    COUNT(*) OVER() as total_count
                FROM tbl_DeviceImages
                WHERE device_id = @deviceId AND is_active = 1
                ORDER BY 
                    CASE image_type 
                        WHEN 'main' THEN 1
                        WHEN 'prospect' THEN 2
                        WHEN 'prospect_pdf' THEN 3
                        ELSE 4
                    END,
                    uploaded_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);
        
        res.json({
            success: true,
            images: result.recordset,
            total: result.recordset.length > 0 ? result.recordset[0].total_count : 0,
            page: page,
            limit: limit
        });
        
    } catch (error) {
        console.error('Ошибка получения галереи:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения галереи'
        });
    }
});

// 62. ОБНОВЛЕНИЕ ЗАПАСОВ (СПИСАНИЕ/КОРРЕКТИРОВКА)
app.post('/api/stock/update', verifyToken, async (req, res) => {
    try {
        const { deviceId, quantityChange, movementType, notes, requestId, requestType, supplierName, documentNumber } = req.body;
        
        if (!deviceId || quantityChange === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Не указаны обязательные параметры'
            });
        }
        
        const transaction = dbPool.transaction();
        await transaction.begin();
        
        try {
            const stockResult = await transaction.request()
                .input('device_id', sql.Int, deviceId)
                .query('SELECT quantity FROM tbl_Stock WHERE device_id = @device_id');
            
            if (stockResult.recordset.length === 0) {
                throw new Error('Прибор не найден на складе');
            }
            
            const currentQuantity = stockResult.recordset[0].quantity;
            const newQuantity = currentQuantity + parseInt(quantityChange);
            
            if (newQuantity < 0) {
                throw new Error('Недостаточно товара на складе');
            }
            
            await transaction.request()
                .input('device_id', sql.Int, deviceId)
                .input('new_quantity', sql.Int, newQuantity)
                .input('last_updated_by', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_Stock 
                    SET quantity = @new_quantity,
                        last_updated = GETDATE(),
                        last_updated_by = @last_updated_by
                    WHERE device_id = @device_id
                `);
            
            await transaction.request()
                .input('device_id', sql.Int, deviceId)
                .input('movement_type', sql.NVarChar, movementType || 'корректировка')
                .input('quantity_change', sql.Int, quantityChange)
                .input('previous_quantity', sql.Int, currentQuantity)
                .input('new_quantity', sql.Int, newQuantity)
                .input('performed_by', sql.Int, req.user.id)
                .input('notes', sql.NVarChar, notes || null)
                .input('request_id', sql.Int, requestId || null)
                .input('request_type', sql.NVarChar, requestType || null)
                .input('supplier_name', sql.NVarChar, supplierName || null)
                .input('document_number', sql.NVarChar, documentNumber || null)
                .query(`
                    INSERT INTO tbl_StockMovements (device_id, movement_type, quantity_change, previous_quantity, new_quantity, performed_by, notes, movement_date, request_id, request_type, supplier_name, document_number)
                    VALUES (@device_id, @movement_type, @quantity_change, @previous_quantity, @new_quantity, @performed_by, @notes, GETDATE(), @request_id, @request_type, @supplier_name, @document_number)
                `);
            
            await transaction.commit();
            
            res.json({
                success: true,
                message: 'Запасы обновлены',
                newQuantity: newQuantity
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('Ошибка обновления запасов:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка обновления запасов'
        });
    }
});

async function generateExcelDocument(doc, documentData) {
    const workbook = XLSX.utils.book_new();
    
    if (doc.document_type === 'invoice_tn2') {
        // Подсчет итогов
        let totalAmount = 0, totalVat = 0, totalWithVat = 0;
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach(item => {
                totalAmount += item.amount || 0;
                totalVat += item.vat || 0;
                totalWithVat += item.amount_with_vat || 0;
            });
        }
        
        const excelData = [];
        
        // Заголовок
        excelData.push(['ТОВАРНАЯ НАКЛАДНАЯ  ' + (documentData.number || '')]);
        excelData.push([]);
        
        // Таблица грузоотправитель/грузополучатель
        excelData.push(['Грузоотправитель', 'Грузополучатель']);
        excelData.push([documentData.seller_name || '', documentData.buyer_name || '']);
        excelData.push(['УНП ' + (documentData.seller_unp || ''), 'УНП ' + (documentData.buyer_unp || '')]);
        excelData.push([documentData.seller_address || '', documentData.buyer_address || '']);
        excelData.push([]);
        
        // Дата
        excelData.push(['Дата: ' + (documentData.date || '')]);
        excelData.push([]);
        
        // Грузоотправитель (поле)
        excelData.push(['Грузоотправитель', (documentData.seller_name || '') + ', ' + (documentData.seller_address || '')]);
        excelData.push(['(наименование, адрес)', '']);
        excelData.push([]);
        
        // Грузополучатель (поле)
        excelData.push(['Грузополучатель', (documentData.buyer_name || '') + ', ' + (documentData.buyer_address || '')]);
        excelData.push(['(наименование, адрес)', '']);
        excelData.push([]);
        
        // Основание отпуска
        excelData.push(['Основание отпуска', 'Договор поставки № ' + (documentData.contract_number || 'б/н') + ' от ' + (documentData.date || '')]);
        excelData.push(['(дата и номер договора или другого документа)', '']);
        excelData.push([]);
        
        // Товарный раздел
        excelData.push(['I. ТОВАРНЫЙ РАЗДЕЛ']);
        excelData.push([]);
        excelData.push(['№', 'Наименование товара', 'Ед.', 'Кол-во', 'Цена, руб.', 'Стоимость без НДС', 'НДС%', 'Сумма НДС', 'Стоимость с НДС', 'Прим.']);
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach((item, index) => {
                excelData.push([
                    (index + 1).toString(),
                    (item.name || '') + (item.model ? ' ' + item.model : ''),
                    'шт',
                    (item.quantity || 0).toFixed(0),
                    (item.price || 0).toFixed(2),
                    (item.amount || 0).toFixed(2),
                    '20',
                    (item.vat || 0).toFixed(2),
                    (item.amount_with_vat || 0).toFixed(2),
                    ''
                ]);
            });
        }
        
        excelData.push(['ИТОГО', '', '', '', '', totalAmount.toFixed(2), '', totalVat.toFixed(2), totalWithVat.toFixed(2), '']);
        excelData.push([]);
        excelData.push(['Всего сумма НДС:', totalVat.toFixed(2) + ' руб.']);
        excelData.push(['Всего стоимость с НДС:', totalWithVat.toFixed(2) + ' руб.']);
        excelData.push([]);
        
        // Подписи
        excelData.push(['Отпуск разрешил:', '']);
        excelData.push(['(должность, фамилия, инициалы, подпись)', '']);
        excelData.push([]);
        
        excelData.push(['Сдал грузоотправитель:', '']);
        excelData.push(['(должность, фамилия, инициалы, подпись грузоотправителя)', '']);
        excelData.push([]);
        
        excelData.push(['Товар к доставке принял:', '']);
        excelData.push(['(должность, фамилия, инициалы, подпись)', '']);
        excelData.push([]);
        
        excelData.push(['по доверенности:', '', 'выданной:', '']);
        excelData.push(['(номер, дата)', '', '(наименование организации)', '']);
        excelData.push([]);
        
        excelData.push(['Принял грузополучатель:', '']);
        excelData.push(['(должность, фамилия, инициалы, подпись грузополучателя)', '']);
        excelData.push([]);
        
        excelData.push(['С товаром переданы документы:', '']);
        
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        worksheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ТН-2');
        
    } else if (doc.document_type === 'waybill_ttn1') {
        // ТТН-1 в вертикальном формате
        let totalAmount = 0, totalVat = 0, totalWithVat = 0, totalWeight = 0, totalItems = 0;
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach(item => {
                totalAmount += item.amount || 0;
                totalVat += item.vat || 0;
                totalWithVat += item.amount_with_vat || 0;
                totalWeight += item.weight || 0;
                totalItems += item.quantity || 0;
            });
        }
        
        const excelData = [];
        
        // Заголовок
        excelData.push(['ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ  ' + (documentData.number || '')]);
        excelData.push([]);
        
        // Таблица грузоотправитель/грузополучатель (УНП)
        excelData.push(['Грузоотправитель', 'Грузополучатель', 'Заказчик (плательщик)']);
        excelData.push([documentData.consignor_name || '', documentData.consignee_name || '', documentData.consignee_name || '']);
        excelData.push(['УНП ' + (documentData.consignor_unp || ''), 'УНП ' + (documentData.consignee_unp || ''), 'УНП ' + (documentData.consignee_unp || '')]);
        excelData.push([]);
        
        // Дата
        excelData.push(['Дата: ' + (documentData.date || '')]);
        excelData.push([]);
        
        // Автомобиль, Прицеп, К путевому листу
        excelData.push(['Автомобиль', documentData.vehicle || '']);
        excelData.push(['Прицеп', '']);
        excelData.push(['К путевому листу №', '']);
        excelData.push([]);
        
        // Водитель
        excelData.push(['Водитель', documentData.driver || '']);
        excelData.push([]);
        
        // Заказчик, Грузоотправитель, Грузополучатель
        excelData.push(['Заказчик автомобильной перевозки (плательщик)', (documentData.consignee_name || '') + ', ' + (documentData.consignee_address || '')]);
        excelData.push(['Грузоотправитель', (documentData.consignor_name || '') + ', ' + (documentData.consignor_address || '')]);
        excelData.push(['Грузополучатель', (documentData.consignee_name || '') + ', ' + (documentData.consignee_address || '')]);
        excelData.push([]);
        
        // Основание отпуска, пункты
        excelData.push(['Основание отпуска', 'Договор поставки № ' + (documentData.contract_number || '') + ' от ' + (documentData.date || '')]);
        excelData.push(['Пункт погрузки', documentData.consignor_address || '']);
        excelData.push(['Пункт разгрузки', documentData.destination || '']);
        excelData.push([]);
        
        // Переадресовка
        excelData.push(['Переадресовка', '']);
        excelData.push([]);
        
        // Товарный раздел
        excelData.push(['I. ТОВАРНЫЙ РАЗДЕЛ']);
        excelData.push([]);
        excelData.push(['Наименование товара', 'Ед. изм', 'Кол-во', 'Цена, руб.', 'Стоимость без НДС', 'НДС%', 'Сумма НДС', 'Стоимость с НДС', 'Кол-во мест', 'Масса, кг', 'Прим.']);
        excelData.push(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach((item, index) => {
                excelData.push([
                    (item.name || '') + (item.model ? ' ' + item.model : ''),
                    'шт',
                    (item.quantity || 0).toFixed(0),
                    (item.price || 0).toFixed(2),
                    (item.amount || 0).toFixed(2),
                    '20',
                    (item.vat || 0).toFixed(2),
                    (item.amount_with_vat || 0).toFixed(2),
                    (item.quantity || 0).toFixed(0),
                    (item.weight || 0).toFixed(2),
                    ''
                ]);
            });
        }
        
        excelData.push(['ИТОГО', '', totalItems.toFixed(0), '', totalAmount.toFixed(2), '', totalVat.toFixed(2), totalWithVat.toFixed(2), totalItems.toFixed(0), totalWeight.toFixed(2), '']);
        excelData.push([]);
        excelData.push(['Всего сумма НДС:', totalVat.toFixed(2) + ' руб.']);
        excelData.push(['Всего стоимость с НДС:', totalWithVat.toFixed(2) + ' руб.']);
        excelData.push(['Всего масса груза:', totalWeight.toFixed(2) + ' кг']);
        excelData.push(['Всего количество грузовых мест:', totalItems + ' (' + numberToWords(totalItems) + ' мест)']);
        excelData.push([]);
        
        // Подписи
        excelData.push(['Отпуск разрешил:', '']);
        excelData.push(['Сдал грузоотправитель:', '']);
        excelData.push(['Товар к перевозке принял:', '']);
        excelData.push(['по доверенности:', '']);
        excelData.push(['Принял грузополучатель:', '']);
        excelData.push(['№ пломбы:', '']);
        excelData.push([]);
        excelData.push(['С товаром переданы документы:', '']);
        
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        worksheet['!cols'] = [{ wch: 40 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ТТН-1');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function generateDocxDocument(doc, documentData) {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = require('docx');
    
    const children = [];
    
    if (doc.document_type === 'invoice_tn2') {
        // Подсчет итогов
        let totalAmount = 0, totalVat = 0, totalWithVat = 0;
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach(item => {
                totalAmount += item.amount || 0;
                totalVat += item.vat || 0;
                totalWithVat += item.amount_with_vat || 0;
            });
        }
        
        const border = { style: BorderStyle.SINGLE, size: 1 };
        const tableBorder = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
        
        children.push(new Paragraph({
            text: 'ТОВАРНАЯ НАКЛАДНАЯ  ' + (documentData.number || ''),
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 28,
            spacing: { after: 400 },
            font: "Times New Roman"
        }));
        
        const partiesRows = [
            new TableRow({
                children: [
                    new TableCell({ 
                        children: [new Paragraph({ text: 'Грузоотправитель', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })],
                        shading: { fill: "f0f0f0" },
                        borders: tableBorder,
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({ 
                        children: [new Paragraph({ text: 'Грузополучатель', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })],
                        shading: { fill: "f0f0f0" },
                        borders: tableBorder,
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: documentData.seller_name || '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: documentData.buyer_name || '', size: 24, font: "Times New Roman" })], borders: tableBorder })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: 'УНП ' + (documentData.seller_unp || ''), size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'УНП ' + (documentData.buyer_unp || ''), size: 24, font: "Times New Roman" })], borders: tableBorder })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: documentData.seller_address || '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: documentData.buyer_address || '', size: 24, font: "Times New Roman" })], borders: tableBorder })
                ]
            })
        ];
        
        const partiesTable = new Table({ 
            rows: partiesRows, 
            width: { size: 60, type: WidthType.PERCENTAGE }, 
            alignment: AlignmentType.CENTER,
            borders: tableBorder
        });
        children.push(partiesTable);
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        
        children.push(new Paragraph({
            text: 'Дата: ' + (documentData.date || ''),
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spacing: { after: 300 },
            font: "Times New Roman"
        }));
        
        children.push(new Paragraph({ text: 'Грузоотправитель', bold: true, size: 28, spacing: { after: 100 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: (documentData.seller_name || '') + ', ' + (documentData.seller_address || ''), size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(наименование, адрес)', size: 20, color: "555555", spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ text: 'Грузополучатель', bold: true, size: 28, spacing: { after: 100 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: (documentData.buyer_name || '') + ', ' + (documentData.buyer_address || ''), size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(наименование, адрес)', size: 20, color: "555555", spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ text: 'Основание отпуска', bold: true, size: 28, spacing: { after: 100 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: 'Договор поставки № ' + (documentData.contract_number || 'б/н') + ' от ' + (documentData.date || ''), size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(дата и номер договора или другого документа)', size: 20, color: "555555", spacing: { after: 300 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({
            text: 'I. ТОВАРНЫЙ РАЗДЕЛ',
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 28,
            spacing: { after: 200 },
            font: "Times New Roman"
        }));
        
        const colWidths = [5, 30, 5, 8, 10, 12, 6, 10, 12, 8];
        
        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: '№', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[0], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Наименование товара', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[1], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Ед.', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[2], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Кол-во', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[3], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Цена, руб.', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[4], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Стоимость без НДС', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[5], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'НДС%', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[6], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Сумма НДС', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[7], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Стоимость с НДС', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[8], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Прим.', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: colWidths[9], type: WidthType.PERCENTAGE } })
            ]
        });
        
        const numberRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: '1', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '2', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '3', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '4', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '5', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '6', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '7', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '8', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '9', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '10', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
            ]
        });
        
        const itemRows = [headerRow, numberRow];
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach((item, index) => {
                itemRows.push(new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.name || '') + (item.model ? ' ' + item.model : ''), size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: 'шт', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.quantity || 0).toFixed(0), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.price || 0).toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.amount || 0).toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: '20', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.vat || 0).toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.amount_with_vat || 0).toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder })
                    ]
                }));
            });
        }
        
        // Итоговая строка
        itemRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: 'ИТОГО', bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalVat.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalWithVat.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder })
            ]
        }));
        
        const itemsTable = new Table({ 
            rows: itemRows, 
            width: { size: 100, type: WidthType.PERCENTAGE }, 
            borders: tableBorder 
        });
        children.push(itemsTable);
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        
        children.push(new Paragraph({ 
            text: `Всего сумма НДС: ${totalVat.toFixed(2)} руб.`, 
            bold: true, 
            size: 24,
            spacing: { after: 50 },
            font: "Times New Roman"
        }));
        children.push(new Paragraph({ 
            text: `Всего стоимость с НДС: ${totalWithVat.toFixed(2)} руб.`, 
            bold: true, 
            size: 24,
            spacing: { after: 300 },
            font: "Times New Roman"
        }));
        
        children.push(new Paragraph({ text: 'Отпуск разрешил:', bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(должность, фамилия, инициалы, подпись)', size: 20, color: "555555", spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ text: 'Сдал грузоотправитель:', bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(должность, фамилия, инициалы, подпись грузоотправителя)', size: 20, color: "555555", spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ text: 'Товар к доставке принял:', bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(должность, фамилия, инициалы, подпись)', size: 20, color: "555555", spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ 
            text: 'по доверенности: ______________________________________ выданной: ______________________________________', 
            size: 24,
            spacing: { after: 50 },
            font: "Times New Roman"
        }));
        children.push(new Paragraph({ 
            text: '(номер, дата)                                              (наименование организации)', 
            size: 20, 
            color: "555555", 
            spacing: { after: 200 },
            font: "Times New Roman"
        }));
        
        children.push(new Paragraph({ text: 'Принял грузополучатель:', bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '(должность, фамилия, инициалы, подпись грузополучателя)', size: 20, color: "555555", spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ text: 'С товаром переданы документы:', bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '______________________________________', size: 24, font: "Times New Roman" }));
        
    } else if (doc.document_type === 'waybill_ttn1') {
        // ТТН-1 с правильными размерами шрифтов
        let totalAmount = 0, totalVat = 0, totalWithVat = 0, totalWeight = 0;
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach(item => {
                totalAmount += item.amount || 0;
                totalVat += item.vat || 0;
                totalWithVat += item.amount_with_vat || 0;
                totalWeight += item.weight || 0;
            });
        }
        
        const border = { style: BorderStyle.SINGLE, size: 1 };
        const tableBorder = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
        
        children.push(new Paragraph({
            text: 'ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ ТТН-1',
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 28,
            spacing: { after: 200 },
            font: "Times New Roman"
        }));
        
        children.push(new Paragraph({
            text: `№ ${documentData.number} от ${documentData.date}`,
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 24,
            spacing: { after: 200 },
            font: "Times New Roman"
        }));
        
        // Таблица сторон (12pt)
        const partiesRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: 'Грузоотправитель', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'Грузополучатель', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'Заказчик (плательщик)', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: documentData.consignor_name || '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: documentData.consignee_name || '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: documentData.consignee_name || '', size: 24, font: "Times New Roman" })], borders: tableBorder })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: 'УНП ' + (documentData.consignor_unp || ''), size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'УНП ' + (documentData.consignee_unp || ''), size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: 'УНП ' + (documentData.consignee_unp || ''), size: 24, font: "Times New Roman" })], borders: tableBorder })
                ]
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: documentData.consignor_address || '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: documentData.consignee_address || '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                    new TableCell({ children: [new Paragraph({ text: documentData.consignee_address || '', size: 24, font: "Times New Roman" })], borders: tableBorder })
                ]
            })
        ];
        
        children.push(new Table({ rows: partiesRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder }));
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        
        children.push(new Paragraph({ text: 'Автомобиль: ' + (documentData.vehicle || '______________'), bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: 'Водитель: ' + (documentData.driver || '______________'), bold: true, size: 24, spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({
            text: 'I. ТОВАРНЫЙ РАЗДЕЛ',
            alignment: AlignmentType.CENTER,
            bold: true,
            size: 28,
            spacing: { after: 200 },
            font: "Times New Roman"
        }));
        
        const ttnColWidths = [5, 30, 5, 8, 10, 12, 6, 10, 12, 10];
        
        const ttnHeaderRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: '№', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[0], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Наименование товара', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[1], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Ед.', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[2], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Кол-во', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[3], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Цена', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[4], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Сумма без НДС', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[5], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'НДС%', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[6], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Сумма НДС', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[7], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Сумма с НДС', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[8], type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: 'Масса, кг', bold: true, alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], shading: { fill: "f0f0f0" }, borders: tableBorder, width: { size: ttnColWidths[9], type: WidthType.PERCENTAGE } })
            ]
        });
        
        const ttnItemRows = [ttnHeaderRow];
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach((item, index) => {
                ttnItemRows.push(new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: (item.name || '') + (item.model ? ' ' + item.model : ''), size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: 'шт', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: item.quantity.toString(), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: item.price.toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: item.amount.toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: '20', alignment: AlignmentType.CENTER, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: item.vat.toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: item.amount_with_vat.toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                        new TableCell({ children: [new Paragraph({ text: item.weight.toFixed(2), alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder })
                    ]
                }));
            });
        }
        
        ttnItemRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: 'ИТОГО', bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalAmount.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: '', size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalVat.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalWithVat.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder }),
                new TableCell({ children: [new Paragraph({ text: totalWeight.toFixed(2), bold: true, alignment: AlignmentType.RIGHT, size: 24, font: "Times New Roman" })], borders: tableBorder })
            ]
        }));
        
        const ttnTable = new Table({ rows: ttnItemRows, width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorder });
        children.push(ttnTable);
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        
        children.push(new Paragraph({ text: `Всего сумма НДС: ${totalVat.toFixed(2)} руб.`, bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: `Всего стоимость с НДС: ${totalWithVat.toFixed(2)} руб.`, bold: true, size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: `Всего масса груза: ${totalWeight.toFixed(2)} кг`, bold: true, size: 24, spacing: { after: 200 }, font: "Times New Roman" }));
        
        children.push(new Paragraph({ text: 'Отпуск разрешил: ______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: 'Товар к перевозке принял: ______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: 'Сдал грузоотправитель: ______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: 'по доверенности: ______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: 'Принял грузополучатель: ______________________________________', size: 24, spacing: { after: 50 }, font: "Times New Roman" }));
        children.push(new Paragraph({ text: '№ пломбы: ______________', size: 24, font: "Times New Roman" }));
    }
    
    const docx = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Times New Roman" }
                }
            }
        },
        sections: [{
            properties: {},
            children: children
        }]
    });
    
    return await Packer.toBuffer(docx);
}

function generateHtmlContent(doc, documentData, currentUser = null) {
   let html = '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>' + doc.document_type + '</title>';
    html += '<style>';
    html += '* { margin: 0; padding: 0; box-sizing: border-box; }';
    html += 'body { font-family: "Times New Roman", Times, serif; font-size: 10pt; margin: 15mm; line-height: 1.2; }';
    html += 'h1 { font-size: 14pt; text-align: center; font-weight: bold; margin-bottom: 5px; }';
    html += 'h2 { font-size: 12pt; text-align: center; font-weight: bold; margin: 10px 0; }';
    html += 'table { width: 100%; border-collapse: collapse; margin: 10px 0; }';
    html += 'th, td { border: 1px solid #000; padding: 6px; vertical-align: top; }';
    html += 'th { background-color: #f0f0f0; font-weight: bold; text-align: center; }';
    html += '.header-table td { border: none; padding: 4px; }';
    html += '.field-block { margin-bottom: 12px; }';
    html += '.field-name { font-weight: bold; margin-bottom: 2px; }';
    html += '.field-line { border-bottom: 1px solid #000; width: 100%; min-height: 16px; margin: 2px 0; }';
    html += '.field-hint { font-size: 7pt; color: #555; margin-top: 1px; }';
    html += '.two-columns { display: flex; gap: 30px; margin-bottom: 15px; }';
    html += '.column { flex: 1; }';
    html += '.three-columns { display: flex; gap: 20px; margin-bottom: 15px; }';
    html += '.signature-line { display: inline-block; width: 250px; border-bottom: 1px solid #000; margin-left: 10px; }';
    html += '.signature-name { font-weight: bold; display: inline-block; min-width: 150px; }';
    html += '.signature-row { margin: 15px 0; }';
    html += '.signature-left { display: inline-block; width: 48%; }';
    html += '.signature-right { display: inline-block; width: 48%; }';
    html += '.total-row { font-weight: bold; margin: 5px 0; }';
    html += '.section-title { font-size: 12pt; font-weight: bold; margin: 20px 0 10px 0; text-align: center; }';
    html += '.items-table td, .items-table th { text-align: center; }';
    html += '.items-table td:first-child, .items-table th:first-child { text-align: left; }';
    html += '.text-right { text-align: right; }';
    html += '</style>';
    html += '</head><body>';
    
    if (doc.document_type === 'invoice_tn2') {
        
        let totalAmount = 0;
        let totalVat = 0;
        let totalWithVat = 0;
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach(item => {
                totalAmount += item.amount || 0;
                totalVat += item.vat || 0;
                totalWithVat += item.amount_with_vat || 0;
            });
        }
        
        // Заголовок
        html += '<h1 style="text-align: center; margin-bottom: 30px; font-size: 15pt; font-weight: bold;">ТОВАРНАЯ НАКЛАДНАЯ  ' + (documentData.number || '') + '</h1>';
        
        // Таблица грузоотправитель/грузополучатель
        html += '<table class="parties-table" style="width: 35%; margin: 0 auto 15px auto; border-collapse: collapse;">';
        html += '<tr>';
        html += '<td class="label" style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 50%; font-size: 12pt;">Грузоотправитель</td>';
        html += '<td class="label" style="border: 1px solid #000; padding: 4px 8px; font-weight: bold; background-color: #f0f0f0; text-align: center; width: 50%; font-size: 12pt;">Грузополучатель</td>';
        html += '</tr>';
        html += '<tr>';
        html += '<td style="border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 12pt;">' + (documentData.seller_unp || '') + '</td>';
        html += '<td style="border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 12pt;">' + (documentData.buyer_unp || '') + '</td>';
        html += '</tr>';
        html += '</table>';
        
        html += '<div style="text-align: left; margin-top: -30px; margin-left: calc(57% - 25% - 40px); font-weight: bold; font-size: 12pt;">УНП</div>';
        html += '<div style="text-align: center; margin: 20px 0 20px 0; font-size: 14pt; font-weight: bold;">' + (documentData.date || '') + '</div>';
        
        // Грузоотправитель
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; min-width: 180px;">Грузоотправитель</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">' + (documentData.seller_name || '') + ', ' + (documentData.seller_address || '') + '</div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 180px;">(наименование, адрес)</div>';
        html += '</div>';
        
        // Грузополучатель
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; min-width: 180px;">Грузополучатель</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">' + (documentData.buyer_name || '') + ', ' + (documentData.buyer_address || '') + '</div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 180px;">(наименование, адрес)</div>';
        html += '</div>';
        
        // Основание отпуска
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; min-width: 180px;">Основание отпуска</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Договор поставки № ' + (documentData.contract_number || 'б/н') + ' от ' + (documentData.date || '') + '</div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 180px;">(дата и номер договора или другого документа)</div>';
        html += '</div>';
        
        // Товарный раздел
        html += '<div class="section-title" style="font-size: 15pt; font-weight: bold; text-align: center; margin: 20px 0 15px 0;">I. ТОВАРНЫЙ РАЗДЕЛ</div>';
        
        html += '<table class="items-table" style="width: 100%; border-collapse: collapse; margin: 15px 0;">';
        html += '<thead>';
        html += '<tr>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">№</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Наименование товара</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Ед.</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Кол-во</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Цена, руб.</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Стоимость без НДС</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">НДС%</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Сумма НДС</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Стоимость с НДС</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; background-color: #f0f0f0; font-size: 12pt;">Прим.</th>';
        html += '</tr>';
        html += '<tr style="background-color: #f0f0f0;">';
        html += '<th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">1</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">2</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">3</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">4</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">5</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">6</th>';
        html += '<th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">7</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">8</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">9</th><th style="border: 1px solid #000; padding: 5px; font-size: 10pt;">10</th>';
        html += '</tr>';
        html += '</thead>';
        html += '<tbody>';
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach((item, index) => {
                html += '<tr>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12pt;">' + (index + 1) + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; font-size: 12pt;">' + (item.name || '') + (item.model ? ' ' + item.model : '') + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12pt;">шт</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + (item.quantity || 0).toFixed(0) + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + (item.price || 0).toFixed(2) + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + (item.amount || 0).toFixed(2) + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12pt;">20</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + (item.vat || 0).toFixed(2) + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + (item.amount_with_vat || 0).toFixed(2) + '</td>';
                html += '<td style="border: 1px solid #000; padding: 6px;">&nbsp;</td>';
                html += '</tr>';
            });
        } else {
            html += '<tr><td colspan="10" style="border: 1px solid #000; padding: 30px; text-align: center; font-size: 14pt;">Нет данных</td>';
        }
        
        html += '<tr style="font-weight: bold;">';
        html += '<td colspan="5" style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">ИТОГО</td>';
        html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + totalAmount.toFixed(2) + '</td>';
        html += '<td style="border: 1px solid #000; padding: 6px; text-align: center;">&nbsp;</td>';
        html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + totalVat.toFixed(2) + '</td>';
        html += '<td style="border: 1px solid #000; padding: 6px; text-align: right; font-size: 12pt;">' + totalWithVat.toFixed(2) + '</td>';
        html += '<td style="border: 1px solid #000; padding: 6px;">&nbsp;</td>';
        html += '</tr>';
        
        html += '</tbody>';
        html += '</table>';
        
        // Итоги с прописью
        html += '<div class="totals" style="margin: 10px 0; font-weight: bold;">';
        html += '<div style="display: flex; align-items: baseline; margin-bottom: 30px;">';
        html += '<div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего сумма НДС</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">';
        html += totalVat.toFixed(2) + ' руб. (' + numberToWordsRu(Math.floor(totalVat)) + ' рублей ' + Math.round((totalVat % 1) * 100) + ' копеек)';
        html += '</div></div>';
        html += '<div style="display: flex; align-items: baseline; margin-bottom: 30px;">';
        html += '<div style="font-size: 14pt; width: 250px; font-weight: bold;">Всего стоимость с НДС</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt; font-weight: normal;">';
        html += totalWithVat.toFixed(2) + ' руб. (' + numberToWordsRu(Math.floor(totalWithVat)) + ' рублей ' + Math.round((totalWithVat % 1) * 100) + ' копеек)';
        html += '</div></div>';
        html += '</div>';
        
        html += '<div class="signatures" style="margin-top: 30px;">';
        
        // Отпуск разрешил
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Отпуск разрешил</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Менеджер Иванов И.И.</div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись)</div>';
        html += '</div>';
        
        // Сдал грузоотправитель - используем currentUser
        const userFullName = (currentUser && currentUser.full_name) ? currentUser.full_name : '______________________';
        const userPosition = (currentUser && currentUser.position) ? currentUser.position : '______________________';
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Сдал грузоотправитель</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">' + userPosition + ' ' + userFullName + '</div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись грузоотправителя)</div>';
        html += '</div>';
        
        // Товар к доставке принял
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Товар к доставке принял</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись)</div>';
        html += '</div>';
        
        // по доверенности
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">по доверенности</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; white-space: nowrap; margin-left: 10px; margin-right: 10px;">выданной</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>';
        html += '</div>';
        html += '<div style="display: flex; margin-top: 5px;">';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; flex: 1; margin-left: 250px;">(номер, дата)</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; flex: 1; margin-left: 100px;">(наименование организации)</div>';
        html += '</div>';
        html += '</div>';
        
        // Принял грузополучатель
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">Принял грузополучатель</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;"></div>';
        html += '</div>';
        html += '<div class="field-hint" style="font-size: 11pt; color: #555; margin-left: 250px;">(должность, фамилия, инициалы, подпись грузополучателя)</div>';
        html += '</div>';
        
        // С товаром переданы документы
        const docNumber = documentData.number || '______________';
        html += '<div class="field-block" style="margin-bottom: 15px;">';
        html += '<div style="display: flex; align-items: baseline;">';
        html += '<div class="field-name" style="font-weight: bold; font-size: 14pt; width: 250px;">С товаром переданы документы</div>';
        html += '<div class="field-line" style="border-bottom: 1px solid #000; flex: 1; font-size: 12pt;">Товарная накладная  ' + docNumber + '</div>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
    } else if (doc.document_type === 'waybill_ttn1') {
        html += '<h1>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ ТТН-1</h1>';
        html += '<h2>№ ' + (documentData.number || '') + ' от ' + (documentData.date || '') + '</h2>';
        
        // Стороны
        html += '<table class="header-table" style="width: 100%; margin-bottom: 15px;">';
        html += '<tr><td style="width: 33%;"><strong>Грузоотправитель</strong></td>';
        html += '<td style="width: 33%;"><strong>Грузополучатель</strong></td>';
        html += '<td style="width: 34%;"><strong>Заказчик (плательщик)</strong></td></tr>';
        html += '<tr><td>' + (documentData.consignor_name || '') + '<br>УНП ' + (documentData.consignor_unp || '') + '<br>' + (documentData.consignor_address || '') + '</td>';
        html += '<td>' + (documentData.consignee_name || '______________') + '<br>УНП ' + (documentData.consignee_unp || '___________') + '<br>' + (documentData.consignee_address || '______________') + '</td>';
        html += '<td>' + (documentData.consignee_name || '______________') + '<br>УНП ' + (documentData.consignee_unp || '___________') + '<br>' + (documentData.consignee_address || '______________') + '</td>';
        html += '</tr>';
        html += '</table>';
        
        // Автомобиль и водитель
        html += '<div class="two-columns">';
        html += '<div class="column">';
        html += '<div class="field-block"><div class="field-name">Автомобиль:</div><div class="field-line">' + (documentData.vehicle || '______________') + '</div><div class="field-hint">(марка, регистрационный знак)</div></div>';
        html += '<div class="field-block"><div class="field-name">Прицеп:</div><div class="field-line">______________</div><div class="field-hint">(марка, регистрационный знак)</div></div>';
        html += '<div class="field-block"><div class="field-name">К путевому листу №:</div><div class="field-line">______________</div></div>';
        html += '</div>';
        html += '<div class="column">';
        html += '<div class="field-block"><div class="field-name">Водитель:</div><div class="field-line">' + (documentData.driver || '______________') + '</div><div class="field-hint">(наименование)</div></div>';
        html += '<div class="field-block"><div class="field-name">Фамилия и инициалы:</div><div class="field-line">' + (documentData.driver || '______________') + '</div><div class="field-hint">(фамилия и инициалы)</div></div>';
        html += '</div>';
        html += '</div>';
        
        // Заказчик, грузоотправитель, грузополучатель
        html += '<div class="field-block"><div class="field-name">Заказчик автомобильной перевозки (плательщик):</div><div class="field-line">' + (documentData.consignee_name || '') + ', ' + (documentData.consignee_address || '') + '</div><div class="field-hint">(наименование, адрес)</div></div>';
        html += '<div class="field-block"><div class="field-name">Грузоотправитель:</div><div class="field-line">' + (documentData.consignor_name || '') + ', ' + (documentData.consignor_address || '') + '</div><div class="field-hint">(наименование, адрес)</div></div>';
        html += '<div class="field-block"><div class="field-name">Грузополучатель:</div><div class="field-line">' + (documentData.consignee_name || '') + ', ' + (documentData.consignee_address || '') + '</div><div class="field-hint">(наименование, адрес)</div></div>';
        
        // Основание отпуска, пункты
        html += '<div class="three-columns">';
        html += '<div class="column"><div class="field-block"><div class="field-name">Основание отпуска:</div><div class="field-line">______________</div><div class="field-hint">(дата и номер договора)</div></div></div>';
        html += '<div class="column"><div class="field-block"><div class="field-name">Пункт погрузки:</div><div class="field-line">' + (documentData.consignor_address || '') + '</div></div></div>';
        html += '<div class="column"><div class="field-block"><div class="field-name">Пункт разгрузки:</div><div class="field-line">' + (documentData.destination || '') + '</div></div></div>';
        html += '</div>';
        
        // Переадресовка
        html += '<div class="field-block"><div class="field-name">Переадресовка:</div><div class="field-line" style="min-height: 25px;"></div><div class="field-hint">(наименование, адрес нового получателя, подпись)</div></div>';
        
        // Товарный раздел
        html += '<div class="section-title">I. ТОВАРНЫЙ РАЗДЕЛ</div>';
        
        html += '<table class="items-table" style="width: 100%; border-collapse: collapse;">';
        html += '<thead>';
        html += '<tr>';
        html += '<th>№</th><th>Наименование товара</th><th>Ед.</th><th>Кол-во</th><th>Цена</th>';
        html += '<th>Сумма без НДС</th><th>НДС%</th><th>Сумма НДС</th><th>Сумма с НДС</th><th>Мест</th><th>Масса, кг</th><th>Прим.</th>';
        html += '</tr>';
        html += '</thead>';
        html += '<tbody>';
        
        let totalAmountTTN = 0, totalVatTTN = 0, totalWithVatTTN = 0, totalWeightTTN = 0, totalItemsTTN = 0;
        
        if (documentData.items && documentData.items.length > 0) {
            documentData.items.forEach((item, index) => {
                html += '<tr>';
                html += '<td style="text-align: center;">' + (index + 1) + '</td>';
                html += '<td style="text-align: left;">' + (item.name || '') + (item.model ? ' ' + item.model : '') + '</td>';
                html += '<td style="text-align: center;">шт</td>';
                html += '<td style="text-align: right;">' + (item.quantity || 0) + '</td>';
                html += '<td style="text-align: right;">' + (item.price || 0).toFixed(2) + '</td>';
                html += '<td style="text-align: right;">' + (item.amount || 0).toFixed(2) + '</td>';
                html += '<td style="text-align: center;">20</td>';
                html += '<td style="text-align: right;">' + (item.vat || 0).toFixed(2) + '</td>';
                html += '<td style="text-align: right;">' + (item.amount_with_vat || 0).toFixed(2) + '</td>';
                html += '<td style="text-align: right;">' + (item.quantity || 0) + '</td>';
                html += '<td style="text-align: right;">' + (item.weight || 0).toFixed(2) + '</td>';
                html += '<td style="text-align: left;">&nbsp;</td>';
                html += '</tr>';
                totalAmountTTN += item.amount || 0;
                totalVatTTN += item.vat || 0;
                totalWithVatTTN += item.amount_with_vat || 0;
                totalWeightTTN += item.weight || 0;
                totalItemsTTN += item.quantity || 0;
            });
        }
        
        html += '<tr style="font-weight: bold;">';
        html += '<td colspan="5" style="text-align: right;">ИТОГО</td>';
        html += '<td style="text-align: right;">' + totalAmountTTN.toFixed(2) + '</td>';
        html += '<td style="text-align: center;">&nbsp;</td>';
        html += '<td style="text-align: right;">' + totalVatTTN.toFixed(2) + '</td>';
        html += '<td style="text-align: right;">' + totalWithVatTTN.toFixed(2) + '</td>';
        html += '<td style="text-align: right;">' + totalItemsTTN + '</td>';
        html += '<td style="text-align: right;">' + totalWeightTTN.toFixed(2) + '</td>';
        html += '<td style="text-align: left;">&nbsp;</td>';
        html += '</tr>';
        
        html += '</tbody>';
        html += '</table>';
        
        html += '<div class="total-row">Всего сумма НДС: ' + totalVatTTN.toFixed(2) + ' руб.</div>';
        html += '<div class="total-row">Всего стоимость с НДС: ' + totalWithVatTTN.toFixed(2) + ' руб.</div>';
        html += '<div class="total-row">Всего масса груза: ' + totalWeightTTN.toFixed(2) + ' кг</div>';
        html += '<div class="total-row">Всего количество грузовых мест: ' + totalItemsTTN + '</div>';
        
        // Подписи
        html += '<div class="signatures" style="margin-top: 30px;">';
        
        html += '<div class="signature-row">';
        html += '<div class="signature-left"><span class="signature-name">Отпуск разрешил:</span><span class="signature-line"></span></div>';
        html += '<div class="signature-right"><span class="signature-name">Товар к перевозке принял:</span><span class="signature-line"></span></div>';
        html += '</div>';
        html += '<div class="field-hint" style="margin-left: 0;">(должность, фамилия, инициалы, подпись)</div>';
        
        html += '<div class="signature-row">';
        html += '<div class="signature-left"><span class="signature-name">Сдал грузоотправитель:</span><span class="signature-line"></span></div>';
        html += '<div class="signature-right"><span class="signature-name">по доверенности:</span><span class="signature-line" style="width: 150px;"></span></div>';
        html += '</div>';
        html += '<div class="field-hint" style="margin-left: 0;">(должность, фамилия, инициалы, подпись)</div>';
        html += '<div class="field-hint" style="margin-left: 350px;">(номер, дата)</div>';
        
        html += '<div class="signature-row">';
        html += '<div class="signature-left"><span class="signature-name">Принял грузополучатель:</span><span class="signature-line"></span></div>';
        html += '</div>';
        html += '<div class="field-hint" style="margin-left: 0;">(должность, фамилия, инициалы, подпись)</div>';
        html += '<div class="field-hint" style="margin-left: 0;">№ пломбы: ______________</div>';
        
        html += '</div>';
    }
    
    html += '</body></html>';
    return html;
}

// Функция создания системного уведомления
async function createSystemNotification(userId, type, title, message, link = null) {
    try {
        await dbPool.request()
            .input('userId', sql.Int, userId)
            .input('type', sql.NVarChar, type)
            .input('title', sql.NVarChar, title)
            .input('message', sql.NVarChar, message)
            .input('link', sql.NVarChar, link)
            .query(`
                INSERT INTO tbl_Notifications (user_id, type, title, message, link, created_at)
                VALUES (@userId, @type, @title, @message, @link, GETDATE())
            `);
        console.log(`Уведомление создано для пользователя ${userId}: ${title}`);
        return true;
    } catch (error) {
        console.error('Ошибка создания уведомления:', error.message);
        return false;
    }
}

async function getUserNotifications(userId, limit = 20) {
    try {
        const result = await dbPool.request()
            .input('userId', sql.Int, userId)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit) 
                    id, type, title, message, link, is_read, 
                    FORMAT(created_at, 'dd.MM.yyyy') as created_at_formatted,
                    created_at
                FROM tbl_Notifications
                WHERE user_id = @userId
                ORDER BY created_at DESC
            `);
        return result.recordset;
    } catch (error) {
        console.error('Ошибка получения уведомлений:', error);
        return [];
    }
}

// Функция получения количества непрочитанных уведомлений
async function getUnreadNotificationsCount(userId) {
    try {
        const result = await dbPool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) as count
                FROM tbl_Notifications
                WHERE user_id = @userId AND is_read = 0
            `);
        return result.recordset[0].count;
    } catch (error) {
        console.error('Ошибка получения количества уведомлений:', error);
        return 0;
    }
}

// Функция отметки уведомления как прочитанного
async function markNotificationAsRead(notificationId, userId) {
    try {
        await dbPool.request()
            .input('id', sql.Int, notificationId)
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE tbl_Notifications 
                SET is_read = 1, read_at = GETDATE()
                WHERE id = @id AND user_id = @userId
            `);
        return true;
    } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
        return false;
    }
}

// Функция отметки всех уведомлений как прочитанных
async function markAllNotificationsAsRead(userId) {
    try {
        await dbPool.request()
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE tbl_Notifications 
                SET is_read = 1, read_at = GETDATE()
                WHERE user_id = @userId AND is_read = 0
            `);
        return true;
    } catch (error) {
        console.error('Ошибка отметки всех уведомлений:', error);
        return false;
    }
}

// 63. ПОЛУЧЕНИЕ СПИСКА ВСЕХ ПРОИЗВОДИТЕЛЕЙ
app.get('/api/manufacturers', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT DISTINCT manufacturer 
                FROM tbl_Devices 
                WHERE status = 'active' AND manufacturer IS NOT NULL AND manufacturer != ''
                ORDER BY manufacturer
            `);
        
        res.json({
            success: true,
            manufacturers: result.recordset.map(m => m.manufacturer)
        });
    } catch (error) {
        console.error('Ошибка получения производителей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения производителей'
        });
    }
});

// 64. ПОЛУЧЕНИЕ ДИАПАЗОНА ЦЕН (мин и макс)
app.get('/api/price-range', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request()
            .query(`
                SELECT 
                    MIN(price) as min_price,
                    MAX(price) as max_price
                FROM tbl_Devices 
                WHERE status = 'active' AND price > 0
            `);
        
        res.json({
            success: true,
            minPrice: result.recordset[0].min_price || 0,
            maxPrice: result.recordset[0].max_price || 1000000
        });
    } catch (error) {
        console.error('Ошибка получения диапазона цен:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения диапазона цен'
        });
    }
});

// 66. ПОЛУЧЕНИЕ ПРИБОРОВ НА СХЕМЕ СКОПИРОВАННЫХ
app.get('/api/warehouse/devices', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request().query(`
            SELECT 
                d.id,
                d.unique_id,
                d.name,
                d.category,
                d.price,
                s.quantity,
                s.min_quantity,
                s.location,
                s.shelf,
                s.last_updated,
                u.full_name as last_updated_by_name
            FROM tbl_Devices d
            INNER JOIN tbl_Stock s ON d.id = s.device_id
            LEFT JOIN tbl_Users u ON s.last_updated_by = u.id
            WHERE d.status = 'active' AND s.quantity > 0
            ORDER BY d.category, d.name
        `);
        
        res.json({
            success: true,
            devices: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения приборов для схемы:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения приборов для схемы'
        });
    }
});

// 67. ПЕРЕМЕЩЕНИЕ ПРИБОРА МЕЖДУ СТЕЛЛАЖАМИ
app.post('/api/warehouse/move-device', verifyToken, async (req, res) => {
    const { deviceId, newLocation, newShelf, notes } = req.body;
    
    if (!deviceId || !newLocation) {
        return res.status(400).json({
            success: false,
            message: 'Укажите прибор и новое местоположение'
        });
    }
    
    const transaction = dbPool.transaction();
    await transaction.begin();
    
    try {
        // Получаем текущие данные прибора
        const deviceResult = await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .query(`
                SELECT d.name, d.unique_id, s.location as old_location, s.shelf as old_shelf
                FROM tbl_Devices d
                JOIN tbl_Stock s ON d.id = s.device_id
                WHERE d.id = @deviceId AND d.status = 'active'
            `);
        
        if (deviceResult.recordset.length === 0) {
            throw new Error('Прибор не найден');
        }
        
        const device = deviceResult.recordset[0];
        
        // Обновляем местоположение
        await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .input('location', sql.NVarChar, newLocation)
            .input('shelf', sql.NVarChar, newShelf || null)
            .input('updatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE tbl_Stock 
                SET location = @location,
                    shelf = @shelf,
                    last_updated = GETDATE(),
                    last_updated_by = @updatedBy
                WHERE device_id = @deviceId
            `);
        
        // Записываем движение
        await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .input('movement_type', sql.NVarChar, 'перемещение')
            .input('quantity_change', sql.Int, 0)
            .input('previous_quantity', sql.Int, 0)
            .input('new_quantity', sql.Int, 0)
            .input('performed_by', sql.Int, req.user.id)
            .input('notes', sql.NVarChar, notes || `Перемещение: ${device.old_location || '-'} → ${newLocation}${newShelf ? ` / Полка ${newShelf}` : ''}`)
            .query(`
                INSERT INTO tbl_StockMovements (
                    device_id, movement_type, quantity_change, previous_quantity, new_quantity,
                    performed_by, notes, movement_date
                ) VALUES (
                    @deviceId, @movement_type, @quantity_change, @previous_quantity, @new_quantity,
                    @performed_by, @notes, GETDATE()
                )
            `);
        
        await transaction.commit();
        
        // Отправляем уведомление (опционально)
        if (req.user.role === 'admin' && device.old_location !== newLocation) {
            await createSystemNotification(
                req.user.id,
                'device_moved',
                '📦 Прибор перемещен',
                `Прибор "${device.name}" (${device.unique_id}) перемещен из "${device.old_location || 'не указано'}" в "${newLocation}"`,
                `/devices/${deviceId}`
            );
        }
        
        res.json({
            success: true,
            message: `Прибор "${device.name}" перемещен в ${newLocation}${newShelf ? ` (полка ${newShelf})` : ''}`,
            oldLocation: device.old_location,
            newLocation: newLocation
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка перемещения прибора:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка при перемещении прибора'
        });
    }
});

app.post('/api/replenishment-requests/:id/fulfill', verifyToken, requireAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { actualQuantity, notes } = req.body;
        
        if (!actualQuantity || actualQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Укажите фактическое количество поступления'
            });
        }
        
        console.log(`📦 Выполнение заявки ${requestId}, фактически поступило: ${actualQuantity} шт.`);
        
        const series = generateDocumentSeries(requestId, 3);
        const nextNum = await getNextReplenishmentTTNNumber(series, dbPool);
        const ttnNumber = `Серия ${series} №${String(nextNum).padStart(7, '0')}`;
        
        console.log(`📄 Сгенерирован номер ТТН-1: ${ttnNumber}`);
        
        // Начинаем транзакцию
        const transaction = dbPool.transaction();
        await transaction.begin();
        
        try {
            // Получаем данные заявки
            const requestResult = await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .query(`
                    SELECT 
                        rr.id,
                        rr.device_id,
                        rr.quantity_requested,
                        ISNULL(rr.fulfilled_quantity, 0) as fulfilled_quantity,
                        rr.status,
                        d.name as device_name,
                        d.unique_id,
                        d.price
                    FROM tbl_ReplenishmentRequests rr
                    JOIN tbl_Devices d ON rr.device_id = d.id
                    WHERE rr.id = @RequestId
                `);
            
            if (requestResult.recordset.length === 0) {
                throw new Error('Заявка не найдена');
            }
            
            const request = requestResult.recordset[0];
            
            // Проверяем статус заявки
            if (request.status !== 'pending' && request.status !== 'processing') {
                throw new Error('Заявка уже выполнена или отклонена');
            }
            
            // Вычисляем остаток
            const remainingQuantity = request.quantity_requested - request.fulfilled_quantity;
            
            if (actualQuantity > remainingQuantity) {
                throw new Error(`Фактическое количество (${actualQuantity}) превышает остаток к поставке (${remainingQuantity})`);
            }
            
            // Обновляем заявку
            const newFulfilled = request.fulfilled_quantity + actualQuantity;
            const newRemaining = request.quantity_requested - newFulfilled;
            const newStatus = newRemaining === 0 ? 'completed' : 'processing';
            
            await transaction.request()
                .input('RequestId', sql.Int, requestId)
                .input('NewFulfilled', sql.Int, newFulfilled)
                .input('NewRemaining', sql.Int, newRemaining)
                .input('NewStatus', sql.NVarChar, newStatus)
                .input('PerformedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_ReplenishmentRequests 
                    SET 
                        fulfilled_quantity = @NewFulfilled,
                        remaining_quantity = @NewRemaining,
                        status = @NewStatus,
                        last_fulfilled_at = CAST(GETDATE() AS DATE),
                        approved_by = CASE WHEN status = 'pending' THEN @PerformedBy ELSE approved_by END,
                        approved_at = CASE WHEN status = 'pending' THEN CAST(GETDATE() AS DATE) ELSE approved_at END,
                        completed_at = CASE WHEN @NewStatus = 'completed' THEN CAST(GETDATE() AS DATE) ELSE completed_at END
                    WHERE id = @RequestId
                `);
            
            // Получаем текущее количество на складе
            const stockResult = await transaction.request()
                .input('DeviceId', sql.Int, request.device_id)
                .query(`
                    SELECT ISNULL(quantity, 0) as quantity 
                    FROM tbl_Stock 
                    WHERE device_id = @DeviceId
                `);
            
            const currentStock = stockResult.recordset.length > 0 ? stockResult.recordset[0].quantity : 0;
            const newStock = currentStock + actualQuantity;
            
            // Обновляем склад
            if (stockResult.recordset.length === 0) {
                await transaction.request()
                    .input('DeviceId', sql.Int, request.device_id)
                    .input('Quantity', sql.Int, actualQuantity)
                    .input('MinQuantity', sql.Int, 5)
                    .input('PerformedBy', sql.Int, req.user.id)
                    .query(`
                        INSERT INTO tbl_Stock (device_id, quantity, min_quantity, last_updated_by, last_updated)
                        VALUES (@DeviceId, @Quantity, @MinQuantity, @PerformedBy, CAST(GETDATE() AS DATE))
                    `);
            } else {
                await transaction.request()
                    .input('DeviceId', sql.Int, request.device_id)
                    .input('NewStock', sql.Int, newStock)
                    .input('PerformedBy', sql.Int, req.user.id)
                    .query(`
                        UPDATE tbl_Stock 
                        SET quantity = @NewStock,
                            last_updated = CAST(GETDATE() AS DATE),
                            last_updated_by = @PerformedBy
                        WHERE device_id = @DeviceId
                    `);
            }
            
            // Записываем движение с правильным ТТН-1
            await transaction.request()
                .input('DeviceId', sql.Int, request.device_id)
                .input('MovementType', sql.NVarChar, 'поступление по заявке')
                .input('QuantityChange', sql.Int, actualQuantity)
                .input('PreviousQuantity', sql.Int, currentStock)
                .input('NewQuantity', sql.Int, newStock)
                .input('PerformedBy', sql.Int, req.user.id)
                .input('Notes', sql.NVarChar, `Поступление по заявке на пополнение. Фактически поступило: ${actualQuantity} шт. ${notes ? notes : ''}`)
                .input('RequestId', sql.Int, requestId)
                .input('RequestType', sql.NVarChar, 'replenishment')
                .input('DocumentNumber', sql.NVarChar, ttnNumber)
                .query(`
                    INSERT INTO tbl_StockMovements 
                        (device_id, movement_type, quantity_change, previous_quantity, new_quantity,
                         performed_by, notes, movement_date, request_id, request_type, document_number)
                    VALUES 
                        (@DeviceId, @MovementType, @QuantityChange, @PreviousQuantity, @NewQuantity,
                         @PerformedBy, @Notes, CAST(GETDATE() AS DATE), @RequestId, @RequestType, @DocumentNumber)
                `);
            
            await transaction.commit();
            
            // Получаем все ТТН по этой заявке для ответа
            const allDocuments = await dbPool.request()
                .input('requestId', sql.Int, requestId)
                .query(`
                    SELECT 
                        sm.document_number,
                        sm.movement_date,
                        sm.quantity_change,
                        sm.notes
                    FROM tbl_StockMovements sm
                    WHERE sm.request_id = @requestId 
                      AND sm.request_type = 'replenishment'
                      AND sm.document_number IS NOT NULL
                    ORDER BY sm.movement_date ASC
                `);
            
            // Получаем данные заявки для уведомления
            const requestData = await dbPool.request()
                .input('RequestId', sql.Int, requestId)
                .query(`
                    SELECT 
                        rr.created_by, 
                        d.name as device_name, 
                        rr.request_number, 
                        rr.remaining_quantity
                    FROM tbl_ReplenishmentRequests rr
                    JOIN tbl_Devices d ON rr.device_id = d.id
                    WHERE rr.id = @RequestId
                `);
            
            // Отправляем уведомление ТОЛЬКО если заявку создал НЕ текущий пользователь
            if (requestData.recordset.length > 0 && requestData.recordset[0].created_by) {
                const reqInfo = requestData.recordset[0];
                
                if (reqInfo.created_by !== req.user.id) {
                    let notificationMessage = '';
                    
                    if (newStatus === 'completed') {
                        notificationMessage = `Заявка №${reqInfo.request_number} на прибор "${reqInfo.device_name}" полностью выполнена.`;
                    } else {
                        notificationMessage = `Заявка №${reqInfo.request_number} на прибор "${reqInfo.device_name}" выполнена частично. Принято ${actualQuantity} шт., осталось ${newRemaining} шт.`;
                    }
                    
                    await createSystemNotification(
                        reqInfo.created_by,
                        'replenishment_fulfilled',
                        newStatus === 'completed' ? 'Заявка на пополнение выполнена полностью' : 'Заявка на пополнение выполнена частично',
                        notificationMessage,
                        `/replenishment-requests/${requestId}`
                    );
                    
                    console.log(`Уведомление отправлено сотруднику ID: ${reqInfo.created_by}`);
                }
            }
            
            // Формируем ответ
            const result = {
                Success: 1,
                Message: newStatus === 'completed' 
                    ? `Заявка полностью выполнена! Всего поступило: ${newFulfilled} шт.`
                    : `Принято ${actualQuantity} шт. Осталось к поставке: ${newRemaining} шт.`,
                TtnNumber: ttnNumber,
                DeliveryNumber: nextNum,
                FulfilledQuantity: newFulfilled,
                RemainingQuantity: newRemaining,
                Status: newStatus
            };
            
            res.json({
                success: true,
                message: result.Message,
                ttnNumber: result.TtnNumber,
                deliveryNumber: result.DeliveryNumber,
                allDocuments: allDocuments.recordset,
                fulfilledQuantity: result.FulfilledQuantity,
                remainingQuantity: result.RemainingQuantity,
                status: result.Status
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('❌ Ошибка выполнения заявки:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка выполнения заявки'
        });
    }
});

// 70. БЫСТРОЕ ПЕРЕМЕЩЕНИЕ НЕСКОЛЬКИХ ПРИБОРОВ
app.post('/api/warehouse/batch-move', verifyToken, async (req, res) => {
    const { moves } = req.body; // [{ deviceId, newLocation, newShelf }]
    
    if (!moves || !Array.isArray(moves) || moves.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Укажите список перемещений'
        });
    }
    
    const transaction = dbPool.transaction();
    await transaction.begin();
    
    let successCount = 0;
    const errors = [];
    
    try {
        for (const move of moves) {
            try {
                // Проверяем существование прибора
                const deviceCheck = await transaction.request()
                    .input('deviceId', sql.Int, move.deviceId)
                    .query('SELECT id, name, unique_id FROM tbl_Devices WHERE id = @deviceId AND status = "active"');
                
                if (deviceCheck.recordset.length === 0) {
                    errors.push(`Прибор ID ${move.deviceId} не найден`);
                    continue;
                }
                
                const device = deviceCheck.recordset[0];
                
                // Получаем текущее местоположение
                const oldLocation = await transaction.request()
                    .input('deviceId', sql.Int, move.deviceId)
                    .query('SELECT location, shelf FROM tbl_Stock WHERE device_id = @deviceId');
                
                const oldLoc = oldLocation.recordset[0] || { location: null, shelf: null };
                
                // Обновляем
                await transaction.request()
                    .input('deviceId', sql.Int, move.deviceId)
                    .input('location', sql.NVarChar, move.newLocation)
                    .input('shelf', sql.NVarChar, move.newShelf || null)
                    .input('updatedBy', sql.Int, req.user.id)
                    .query(`
                        UPDATE tbl_Stock 
                        SET location = @location,
                            shelf = @shelf,
                            last_updated = GETDATE(),
                            last_updated_by = @updatedBy
                        WHERE device_id = @deviceId
                    `);
                
                // Записываем движение
                await transaction.request()
                    .input('deviceId', sql.Int, move.deviceId)
                    .input('movement_type', sql.NVarChar, 'пакетное перемещение')
                    .input('quantity_change', sql.Int, 0)
                    .input('previous_quantity', sql.Int, 0)
                    .input('new_quantity', sql.Int, 0)
                    .input('performed_by', sql.Int, req.user.id)
                    .input('notes', sql.NVarChar, `Пакетное перемещение: ${oldLoc.location || '-'} → ${move.newLocation}`)
                    .query(`
                        INSERT INTO tbl_StockMovements (
                            device_id, movement_type, quantity_change, previous_quantity, new_quantity,
                            performed_by, notes, movement_date
                        ) VALUES (
                            @deviceId, @movement_type, @quantity_change, @previous_quantity, @new_quantity,
                            @performed_by, @notes, GETDATE()
                        )
                    `);
                
                successCount++;
            } catch (moveError) {
                errors.push(`Ошибка при перемещении прибора ${move.deviceId}: ${moveError.message}`);
            }
        }
        
        await transaction.commit();
        
        res.json({
            success: true,
            successCount: successCount,
            errorCount: errors.length,
            errors: errors
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка пакетного перемещения:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при выполнении пакетного перемещения'
        });
    }
});


// 1. Получение всех неразмещенных приборов
app.get('/api/warehouse/unplaced-devices', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request().query(`
            SELECT 
                d.id,
                d.unique_id,
                d.name,
                d.category,
                d.price,
                ISNULL(s.quantity, 0) as total_quantity,
                ISNULL((
                    SELECT ISNULL(SUM(rp.quantity), 0)
                    FROM tbl_RackPlacement rp 
                    WHERE rp.device_id = d.id
                ), 0) as placed_quantity,
                (ISNULL(s.quantity, 0) - ISNULL((
                    SELECT ISNULL(SUM(rp.quantity), 0)
                    FROM tbl_RackPlacement rp 
                    WHERE rp.device_id = d.id
                ), 0)) as unplaced_quantity
            FROM tbl_Devices d
            INNER JOIN tbl_Stock s ON d.id = s.device_id
            WHERE d.status = 'active' 
                AND ISNULL(s.quantity, 0) > 0
                AND (ISNULL(s.quantity, 0) - ISNULL((
                    SELECT ISNULL(SUM(rp.quantity), 0)
                    FROM tbl_RackPlacement rp 
                    WHERE rp.device_id = d.id
                ), 0)) > 0
            ORDER BY d.category, d.name
        `);
        
        res.json({
            success: true,
            devices: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения неразмещенных приборов:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Получение всех занятых ячеек
app.get('/api/warehouse/rack-cells', verifyToken, async (req, res) => {
    try {
        const result = await dbPool.request().query(`
            SELECT 
                rp.rack_name,
                rp.cell_level,
                rp.cell_column,
                rp.quantity,
                rp.max_quantity,
                d.id as device_id,
                d.unique_id,
                d.name,
                d.category,
                d.price
            FROM tbl_RackPlacement rp
            JOIN tbl_Devices d ON rp.device_id = d.id
            ORDER BY rp.rack_name, rp.cell_level, rp.cell_column
        `);
        
        res.json({
            success: true,
            cells: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения ячеек:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/warehouse/place-device', verifyToken, async (req, res) => {
    const { deviceId, rackName, quantity } = req.body;
    
    console.log('📦 Запрос на размещение:', { deviceId, rackName, quantity });
    
    if (!deviceId || !rackName || !quantity || quantity <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Укажите прибор, стеллаж и количество' 
        });
    }
    
    try {
        // 1. Проверяем прибор
        const deviceResult = await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .query(`
                SELECT d.id, d.name, d.unique_id, d.category, ISNULL(s.quantity, 0) as stock_qty
                FROM tbl_Devices d
                JOIN tbl_Stock s ON d.id = s.device_id
                WHERE d.id = @deviceId AND d.status = 'active'
            `);
        
        if (deviceResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Прибор не найден' });
        }
        
        const device = deviceResult.recordset[0];
        
        // 2. Проверяем, сколько уже размещено
        const placedResult = await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .query('SELECT ISNULL(SUM(quantity), 0) as placed FROM tbl_RackPlacement WHERE device_id = @deviceId');
        
        const placed = placedResult.recordset[0].placed;
        const available = device.stock_qty - placed;
        
        console.log(`📊 Прибор: ${device.name}, на складе: ${device.stock_qty}, размещено: ${placed}, доступно: ${available}`);
        
        if (quantity > available) {
            return res.status(400).json({ 
                success: false, 
                message: `Доступно для размещения: ${available} шт.` 
            });
        }
        
        // 3. Проверяем, можно ли размещать в этом стеллаже (запрет смешивания разных приборов)
        const rackCheckResult = await dbPool.request()
            .input('rackName', sql.NVarChar, rackName)
            .input('deviceId', sql.Int, deviceId)
            .query(`
                SELECT DISTINCT device_id 
                FROM tbl_RackPlacement 
                WHERE rack_name = @rackName AND device_id IS NOT NULL AND device_id != @deviceId
            `);
        
        if (rackCheckResult.recordset.length > 0) {
            const otherDeviceId = rackCheckResult.recordset[0].device_id;
            const otherDeviceResult = await dbPool.request()
                .input('otherDeviceId', sql.Int, otherDeviceId)
                .query('SELECT name FROM tbl_Devices WHERE id = @otherDeviceId');
            
            const otherDeviceName = otherDeviceResult.recordset[0]?.name || 'другим прибором';
            return res.status(400).json({ 
                success: false, 
                message: `❌ Стеллаж ${rackName} уже занят прибором "${otherDeviceName}"! Нельзя смешивать разные приборы в одном стеллаже.` 
            });
        }
        
        let remaining = quantity;
        const placedCells = [];
        const transaction = dbPool.transaction();
        await transaction.begin();
        
        try {
            const maxPerCell = 10; 
            
            // Получаем ВСЕ ячейки в стеллаже (3x3 = 9 ячеек)
            const allCells = [];
            for (let level = 1; level <= 3; level++) {
                for (let col = 1; col <= 3; col++) {
                    allCells.push({ level, column: col });
                }
            }
            
            let totalPlacedInRack = 0;
            
            // Сначала собираем информацию о всех ячейках
            const cellsInfo = [];
            for (const cell of allCells) {
                const cellResult = await transaction.request()
                    .input('rackName', sql.NVarChar, rackName)
                    .input('level', sql.Int, cell.level)
                    .input('column', sql.Int, cell.column)
                    .query(`
                        SELECT * FROM tbl_RackPlacement 
                        WHERE rack_name = @rackName 
                            AND cell_level = @level 
                            AND cell_column = @column
                    `);
                
                let currentQty = 0;
                let currentDeviceId = null;
                
                if (cellResult.recordset.length > 0) {
                    currentQty = cellResult.recordset[0].quantity;
                    currentDeviceId = cellResult.recordset[0].device_id;
                }
                
                // Ячейка подходит, если свободна или занята этим же прибором
                if (currentDeviceId === null || currentDeviceId === deviceId) {
                    const freeSpace = maxPerCell - currentQty;
                    cellsInfo.push({
                        level: cell.level,
                        column: cell.column,
                        currentQty: currentQty,
                        freeSpace: freeSpace,
                        exists: cellResult.recordset.length > 0
                    });
                }
            }
            
            // Сортируем ячейки: сначала те, где уже есть этот прибор (дозаполнение), потом пустые
            cellsInfo.sort((a, b) => {
                if (a.currentQty > 0 && b.currentQty === 0) return -1;
                if (a.currentQty === 0 && b.currentQty > 0) return 1;
                return 0;
            });
            
            // Заполняем ячейки последовательно
            for (const cellInfo of cellsInfo) {
                if (remaining <= 0) break;
                
                const placeQty = Math.min(remaining, cellInfo.freeSpace);
                
                if (placeQty > 0) {
                    if (!cellInfo.exists) {
                        // Создаем новую запись в ячейке
                        await transaction.request()
                            .input('rackName', sql.NVarChar, rackName)
                            .input('cellLevel', sql.Int, cellInfo.level)
                            .input('cellColumn', sql.Int, cellInfo.column)
                            .input('deviceId', sql.Int, deviceId)
                            .input('quantity', sql.Int, placeQty)
                            .input('updatedBy', sql.Int, req.user.id)
                            .query(`
                                INSERT INTO tbl_RackPlacement 
                                    (rack_name, cell_level, cell_column, device_id, quantity, updated_by, placed_at, last_updated)
                                VALUES 
                                    (@rackName, @cellLevel, @cellColumn, @deviceId, @quantity, @updatedBy, GETDATE(), GETDATE())
                            `);
                    } else {
                        // Обновляем существующую запись
                        const newQty = cellInfo.currentQty + placeQty;
                        await transaction.request()
                            .input('rackName', sql.NVarChar, rackName)
                            .input('cellLevel', sql.Int, cellInfo.level)
                            .input('cellColumn', sql.Int, cellInfo.column)
                            .input('quantity', sql.Int, newQty)
                            .input('updatedBy', sql.Int, req.user.id)
                            .query(`
                                UPDATE tbl_RackPlacement 
                                SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                                WHERE rack_name = @rackName AND cell_level = @cellLevel AND cell_column = @cellColumn
                            `);
                    }
                    
                    placedCells.push({
                        rack: rackName,
                        level: cellInfo.level,
                        column: cellInfo.column,
                        quantity: placeQty,
                        newTotal: cellInfo.currentQty + placeQty
                    });
                    
                    totalPlacedInRack += placeQty;
                    remaining -= placeQty;
                    
                    // Записываем историю размещения
                    await transaction.request()
                        .input('deviceId', sql.Int, deviceId)
                        .input('deviceName', sql.NVarChar, device.name)
                        .input('actionType', sql.NVarChar, 'placed')
                        .input('rackName', sql.NVarChar, rackName)
                        .input('cellLevel', sql.Int, cellInfo.level)
                        .input('cellColumn', sql.Int, cellInfo.column)
                        .input('quantityChange', sql.Int, placeQty)
                        .input('newQuantity', sql.Int, placed + totalPlacedInRack)
                        .input('notes', sql.NVarChar, `Размещено ${placeQty} шт. в стеллаже ${rackName} (уровень ${cellInfo.level}, колонка ${cellInfo.column})${cellInfo.currentQty > 0 ? `, теперь ${cellInfo.currentQty + placeQty}/10 шт.` : ''}`)
                        .input('performedBy', sql.Int, req.user.id)
                        .query(`
                            INSERT INTO tbl_PlacementHistory 
                                (device_id, device_name, action_type, rack_name, cell_level, cell_column, quantity_change, new_quantity, notes, performed_by, performed_at)
                            VALUES 
                                (@deviceId, @deviceName, @actionType, @rackName, @cellLevel, @cellColumn, @quantityChange, @newQuantity, @notes, @performedBy, GETDATE())
                        `);
                }
            }
            
            await transaction.commit();
            
            // Формируем сообщение о результате
            let message = '';
            let details = '';
            
            if (placedCells.length > 0) {
                details = '\n📋 Распределение:\n';
                for (const cell of placedCells) {
                    details += `   - Ячейка ${cell.rack} (ур.${cell.level}, кол.${cell.column}): +${cell.quantity} шт. (теперь ${cell.newTotal}/10)\n`;
                }
            }
            
            if (remaining > 0) {
                message = ` В стеллаже ${rackName} недостаточно места!\n Осталось неразмещенных: ${remaining} шт.\nВыберите другой стеллаж для остатка.`;
            } else {
                message = `Успешно размещено`;
            }
            
            res.json({
                success: true,
                message: message,
                placedCells: placedCells,
                placedTotal: totalPlacedInRack,
                remaining: remaining
            });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (error) {
        console.error('❌ Ошибка размещения:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Перемещение прибора между стеллажами
app.post('/api/warehouse/move-device', verifyToken, async (req, res) => {
    const { deviceId, fromRack, fromLevel, fromColumn, toRack, quantity } = req.body;
    
    const transaction = dbPool.transaction();
    await transaction.begin();
    
    try {
        // Проверяем, что в исходной ячейке есть достаточно
        const sourceCell = await transaction.request()
            .input('rackName', sql.NVarChar, fromRack)
            .input('level', sql.Int, fromLevel)
            .input('column', sql.Int, fromColumn)
            .query(`
                SELECT * FROM tbl_RackPlacement 
                WHERE rack_name = @rackName 
                    AND cell_level = @level 
                    AND cell_column = @column
            `);
        
        if (sourceCell.recordset.length === 0) {
            throw new Error('Исходная ячейка не найдена');
        }
        
        const source = sourceCell.recordset[0];
        if (source.quantity < quantity) {
            throw new Error(`В ячейке только ${source.quantity} шт.`);
        }
        
        // Ищем или создаем целевую ячейку
        const targetCell = await transaction.request()
            .input('rackName', sql.NVarChar, toRack)
            .input('level', sql.Int, fromLevel)
            .input('column', sql.Int, fromColumn)
            .query(`
                SELECT * FROM tbl_RackPlacement 
                WHERE rack_name = @rackName 
                    AND cell_level = @level 
                    AND cell_column = @column
            `);
        
        let targetQuantity = 0;
        if (targetCell.recordset.length > 0) {
            const target = targetCell.recordset[0];
            if (target.device_id !== deviceId && target.quantity > 0) {
                throw new Error('Целевая ячейка занята другим прибором');
            }
            targetQuantity = target.quantity + quantity;
            
            await transaction.request()
                .input('rackName', sql.NVarChar, toRack)
                .input('level', sql.Int, fromLevel)
                .input('column', sql.Int, fromColumn)
                .input('quantity', sql.Int, targetQuantity)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_RackPlacement 
                    SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                    WHERE rack_name = @rackName AND cell_level = @level AND cell_column = @column
                `);
        } else {
            await transaction.request()
                .input('rackName', sql.NVarChar, toRack)
                .input('level', sql.Int, fromLevel)
                .input('column', sql.Int, fromColumn)
                .input('deviceId', sql.Int, deviceId)
                .input('quantity', sql.Int, quantity)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    INSERT INTO tbl_RackPlacement 
                        (rack_name, cell_level, cell_column, device_id, quantity, updated_by, placed_at, last_updated)
                    VALUES 
                        (@rackName, @level, @column, @deviceId, @quantity, @updatedBy, GETDATE(), GETDATE())
                `);
            targetQuantity = quantity;
        }
        
        // Уменьшаем исходную ячейку
        const newSourceQty = source.quantity - quantity;
        if (newSourceQty === 0) {
            await transaction.request()
                .input('rackName', sql.NVarChar, fromRack)
                .input('level', sql.Int, fromLevel)
                .input('column', sql.Int, fromColumn)
                .query(`
                    DELETE FROM tbl_RackPlacement 
                    WHERE rack_name = @rackName AND cell_level = @level AND cell_column = @column
                `);
        } else {
            await transaction.request()
                .input('rackName', sql.NVarChar, fromRack)
                .input('level', sql.Int, fromLevel)
                .input('column', sql.Int, fromColumn)
                .input('quantity', sql.Int, newSourceQty)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_RackPlacement 
                    SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                    WHERE rack_name = @rackName AND cell_level = @level AND cell_column = @column
                `);
        }
        
        // Записываем историю
        const deviceInfo = await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .query('SELECT name FROM tbl_Devices WHERE id = @deviceId');
        
        await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .input('deviceName', sql.NVarChar, deviceInfo.recordset[0].name)
            .input('actionType', sql.NVarChar, 'moved')
            .input('rackName', sql.NVarChar, toRack)
            .input('quantityChange', sql.Int, quantity)
            .input('newQuantity', sql.Int, targetQuantity)
            .input('notes', sql.NVarChar, `Перемещено из ${fromRack} (уровень ${fromLevel}, колонка ${fromColumn}) в ${toRack}`)
            .input('performedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO tbl_PlacementHistory 
                    (device_id, device_name, action_type, rack_name, quantity_change, new_quantity, notes, performed_by, performed_at)
                VALUES 
                    (@deviceId, @deviceName, @actionType, @rackName, @quantityChange, @newQuantity, @notes, @performedBy, GETDATE())
            `);
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: `Перемещено ${quantity} шт. из ${fromRack} в ${toRack}`
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка перемещения:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Получение истории размещений
app.get('/api/warehouse/placement-history', verifyToken, async (req, res) => {
    try {
        const { limit = 100, deviceId = null } = req.query;
        
        let query = `
            SELECT TOP (${parseInt(limit)})
                ph.*,
                CONCAT(u.last_name, ' ', u.first_name, ISNULL(' ' + u.middle_name, '')) as performed_by_name
            FROM tbl_PlacementHistory ph
            LEFT JOIN tbl_Users u ON ph.performed_by = u.id
        `;
        
        const request = dbPool.request();
        
        if (deviceId) {
            query += ` WHERE ph.device_id = @deviceId`;
            request.input('deviceId', sql.Int, deviceId);
        }
        
        query += ` ORDER BY ph.performed_at DESC`;
        
        const result = await request.query(query);
        
        res.json({
            success: true,
            history: result.recordset
        });
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Изъятие прибора из ячейки
app.post('/api/warehouse/remove-from-cell', verifyToken, async (req, res) => {
    const { rackName, level, column, quantity } = req.body;
    
    if (!rackName || !level || !column || !quantity || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Укажите стеллаж, уровень, колонку и количество'
        });
    }
    
    const transaction = dbPool.transaction();
    await transaction.begin();
    
    try {
        // Получаем информацию о ячейке
        const cellResult = await transaction.request()
            .input('rackName', sql.NVarChar, rackName)
            .input('level', sql.Int, level)
            .input('column', sql.Int, column)
            .query(`
                SELECT * FROM tbl_RackPlacement 
                WHERE rack_name = @rackName 
                    AND cell_level = @level 
                    AND cell_column = @column
            `);
        
        if (cellResult.recordset.length === 0) {
            throw new Error('Ячейка не найдена');
        }
        
        const cell = cellResult.recordset[0];
        
        if (cell.quantity < quantity) {
            throw new Error(`В ячейке только ${cell.quantity} шт.`);
        }
        
        const newQuantity = cell.quantity - quantity;
        const deviceId = cell.device_id;
        
        // Получаем информацию о приборе
        const deviceResult = await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .query('SELECT name FROM tbl_Devices WHERE id = @deviceId');
        
        const deviceName = deviceResult.recordset[0]?.name || 'Прибор';
        
        // Обновляем или удаляем ячейку
        if (newQuantity === 0) {
            await transaction.request()
                .input('rackName', sql.NVarChar, rackName)
                .input('level', sql.Int, level)
                .input('column', sql.Int, column)
                .query(`
                    DELETE FROM tbl_RackPlacement 
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        } else {
            await transaction.request()
                .input('rackName', sql.NVarChar, rackName)
                .input('level', sql.Int, level)
                .input('column', sql.Int, column)
                .input('quantity', sql.Int, newQuantity)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_RackPlacement 
                    SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        }
        
        await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .input('deviceName', sql.NVarChar, deviceName)
            .input('actionType', sql.NVarChar, 'removed')
            .input('rackName', sql.NVarChar, rackName)
            .input('cellLevel', sql.Int, level)
            .input('cellColumn', sql.Int, column)
            .input('quantityChange', sql.Int, -quantity)
            .input('newQuantity', sql.Int, newQuantity)
            .input('notes', sql.NVarChar, `Изъято ${quantity} шт. со стеллажа ${rackName} (уровень ${level}, колонка ${column})`)
            .input('performedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO tbl_PlacementHistory 
                    (device_id, device_name, action_type, rack_name, cell_level, cell_column, quantity_change, new_quantity, notes, performed_by, performed_at)
                VALUES 
                    (@deviceId, @deviceName, @actionType, @rackName, @cellLevel, @cellColumn, @quantityChange, @newQuantity, @notes, @performedBy, GETDATE())
            `);
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: `Изъято ${quantity} шт. со стеллажа ${rackName}`,
            deviceId: deviceId,
            deviceName: deviceName,
            remaining: newQuantity
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Ошибка изъятия:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/warehouse/move-between-cells', verifyToken, async (req, res) => {
    const { 
        deviceId, 
        fromRack, fromLevel, fromColumn, 
        toRack, toLevel, toColumn, 
        quantity 
    } = req.body;
    
    console.log('🔄 Перемещение:', { deviceId, fromRack, fromLevel, fromColumn, toRack, toLevel, toColumn, quantity });
    
    if (!deviceId || !fromRack || !toRack || !quantity || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Укажите все параметры перемещения'
        });
    }
    
    const transaction = dbPool.transaction();
    await transaction.begin();
    
    try {
        // 1. Проверяем исходную ячейку
        const sourceResult = await transaction.request()
            .input('rackName', sql.NVarChar, fromRack)
            .input('level', sql.Int, fromLevel)
            .input('column', sql.Int, fromColumn)
            .query(`
                SELECT * FROM tbl_RackPlacement 
                WHERE rack_name = @rackName 
                    AND cell_level = @level 
                    AND cell_column = @column
            `);
        
        if (sourceResult.recordset.length === 0) {
            throw new Error('Исходная ячейка не найдена');
        }
        
        const source = sourceResult.recordset[0];
        
        if (source.device_id !== deviceId) {
            throw new Error('В указанной ячейке находится другой прибор');
        }
        
        if (source.quantity < quantity) {
            throw new Error(`В ячейке только ${source.quantity} шт.`);
        }
        
        // 2. Проверяем целевую ячейку
        const targetResult = await transaction.request()
            .input('rackName', sql.NVarChar, toRack)
            .input('level', sql.Int, toLevel)
            .input('column', sql.Int, toColumn)
            .query(`
                SELECT * FROM tbl_RackPlacement 
                WHERE rack_name = @rackName 
                    AND cell_level = @level 
                    AND cell_column = @column
            `);
        
        let target = null;
        if (targetResult.recordset.length > 0) {
            target = targetResult.recordset[0];
            
            // Проверяем, что в целевой ячейке либо пусто, либо тот же прибор
            if (target.device_id !== null && target.device_id !== deviceId) {
                throw new Error('Целевая ячейка занята другим прибором');
            }
        }
        
        // 3. Получаем информацию о приборе
        const deviceResult = await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .query('SELECT name FROM tbl_Devices WHERE id = @deviceId');
        
        const deviceName = deviceResult.recordset[0]?.name || 'Прибор';
        
        // 4. Обновляем исходную ячейку (уменьшаем)
        const newSourceQty = source.quantity - quantity;
        if (newSourceQty === 0) {
            await transaction.request()
                .input('rackName', sql.NVarChar, fromRack)
                .input('level', sql.Int, fromLevel)
                .input('column', sql.Int, fromColumn)
                .query(`
                    DELETE FROM tbl_RackPlacement 
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        } else {
            await transaction.request()
                .input('rackName', sql.NVarChar, fromRack)
                .input('level', sql.Int, fromLevel)
                .input('column', sql.Int, fromColumn)
                .input('quantity', sql.Int, newSourceQty)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_RackPlacement 
                    SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        }
        
        // 5. Обновляем целевую ячейку (увеличиваем)
        let newTargetQty = quantity;
        if (target) {
            newTargetQty = target.quantity + quantity;
            await transaction.request()
                .input('rackName', sql.NVarChar, toRack)
                .input('level', sql.Int, toLevel)
                .input('column', sql.Int, toColumn)
                .input('quantity', sql.Int, newTargetQty)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_RackPlacement 
                    SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        } else {
            await transaction.request()
                .input('rackName', sql.NVarChar, toRack)
                .input('level', sql.Int, toLevel)
                .input('column', sql.Int, toColumn)
                .input('deviceId', sql.Int, deviceId)
                .input('quantity', sql.Int, quantity)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    INSERT INTO tbl_RackPlacement 
                        (rack_name, cell_level, cell_column, device_id, quantity, updated_by, placed_at, last_updated)
                    VALUES 
                        (@rackName, @level, @column, @deviceId, @quantity, @updatedBy, GETDATE(), GETDATE())
                `);
        }
        
        // 6. Записываем историю перемещения
        await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .input('deviceName', sql.NVarChar, deviceName)
            .input('actionType', sql.NVarChar, 'moved')
            .input('rackName', sql.NVarChar, toRack)
            .input('cellLevel', sql.Int, toLevel)
            .input('cellColumn', sql.Int, toColumn)
            .input('quantityChange', sql.Int, quantity)
            .input('newQuantity', sql.Int, newTargetQty)
            .input('notes', sql.NVarChar, `Перемещено ${quantity} шт. из ${fromRack} (ур.${fromLevel}, кол.${fromColumn}) в ${toRack} (ур.${toLevel}, кол.${toColumn})`)
            .input('performedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO tbl_PlacementHistory 
                    (device_id, device_name, action_type, rack_name, cell_level, cell_column, quantity_change, new_quantity, notes, performed_by, performed_at)
                VALUES 
                    (@deviceId, @deviceName, @actionType, @rackName, @cellLevel, @cellColumn, @quantityChange, @newQuantity, @notes, @performedBy, GETDATE())
            `);
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: `Перемещено ${quantity} шт. из ${fromRack} в ${toRack}`,
            fromCell: { rack: fromRack, level: fromLevel, column: fromColumn, newQuantity: newSourceQty },
            toCell: { rack: toRack, level: toLevel, column: toColumn, newQuantity: newTargetQty }
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка перемещения:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/warehouse/remove-from-cell', verifyToken, async (req, res) => {
    const { rackName, level, column, quantity, reason } = req.body;
    
    console.log('📦 Изъятие:', { rackName, level, column, quantity, reason });
    
    if (!rackName || !level || !column || !quantity || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Укажите стеллаж, уровень, колонку и количество'
        });
    }
    
    const transaction = dbPool.transaction();
    await transaction.begin();
    
    try {
        // 1. Получаем информацию о ячейке
        const cellResult = await transaction.request()
            .input('rackName', sql.NVarChar, rackName)
            .input('level', sql.Int, level)
            .input('column', sql.Int, column)
            .query(`
                SELECT * FROM tbl_RackPlacement 
                WHERE rack_name = @rackName 
                    AND cell_level = @level 
                    AND cell_column = @column
            `);
        
        if (cellResult.recordset.length === 0) {
            throw new Error('Ячейка не найдена');
        }
        
        const cell = cellResult.recordset[0];
        
        if (cell.quantity < quantity) {
            throw new Error(`В ячейке только ${cell.quantity} шт.`);
        }
        
        const newQuantity = cell.quantity - quantity;
        const deviceId = cell.device_id;
        
        // 2. Получаем информацию о приборе
        const deviceResult = await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .query('SELECT name FROM tbl_Devices WHERE id = @deviceId');
        
        const deviceName = deviceResult.recordset[0]?.name || 'Прибор';
        
        // 3. Обновляем или удаляем ячейку
        if (newQuantity === 0) {
            await transaction.request()
                .input('rackName', sql.NVarChar, rackName)
                .input('level', sql.Int, level)
                .input('column', sql.Int, column)
                .query(`
                    DELETE FROM tbl_RackPlacement 
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        } else {
            await transaction.request()
                .input('rackName', sql.NVarChar, rackName)
                .input('level', sql.Int, level)
                .input('column', sql.Int, column)
                .input('quantity', sql.Int, newQuantity)
                .input('updatedBy', sql.Int, req.user.id)
                .query(`
                    UPDATE tbl_RackPlacement 
                    SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
                    WHERE rack_name = @rackName 
                        AND cell_level = @level 
                        AND cell_column = @column
                `);
        }
        
        // 4. Записываем историю изъятия
        const reasonText = reason ? ` Причина: ${reason}` : '';
        await transaction.request()
            .input('deviceId', sql.Int, deviceId)
            .input('deviceName', sql.NVarChar, deviceName)
            .input('actionType', sql.NVarChar, 'removed')
            .input('rackName', sql.NVarChar, rackName)
            .input('cellLevel', sql.Int, level)
            .input('cellColumn', sql.Int, column)
            .input('quantityChange', sql.Int, -quantity)
            .input('newQuantity', sql.Int, newQuantity)
            .input('notes', sql.NVarChar, `Изъято ${quantity} шт. со стеллажа ${rackName} (уровень ${level}, колонка ${column}).${reasonText}`)
            .input('performedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO tbl_PlacementHistory 
                    (device_id, device_name, action_type, rack_name, cell_level, cell_column, quantity_change, new_quantity, notes, performed_by, performed_at)
                VALUES 
                    (@deviceId, @deviceName, @actionType, @rackName, @cellLevel, @cellColumn, @quantityChange, @newQuantity, @notes, @performedBy, GETDATE())
            `);
        
        await transaction.commit();
        
        res.json({
            success: true,
            message: `Изъято ${quantity} шт. со стеллажа ${rackName}`,
            deviceId: deviceId,
            deviceName: deviceName,
            remaining: newQuantity,
            removedQuantity: quantity
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка изъятия:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/warehouse/available-cells', verifyToken, async (req, res) => {
    const { deviceId, excludeRack, excludeLevel, excludeColumn } = req.query;
    
    try {
        let query = `
            SELECT 
                rp.rack_name,
                rp.cell_level,
                rp.cell_column,
                rp.quantity as current_quantity,
                CASE 
                    WHEN rp.device_id IS NULL THEN 'empty'
                    WHEN rp.device_id = @deviceId THEN 'same_device'
                    ELSE 'other_device'
                END as cell_status,
                CASE 
                    WHEN rp.device_id IS NULL THEN 'Свободно'
                    WHEN rp.device_id = @deviceId THEN CONCAT('Уже есть ', rp.quantity, ' шт.')
                    ELSE 'Занято другим прибором'
                END as status_text
            FROM (
                -- Генерируем все возможные ячейки (5 рядов x 5 стеллажей x 3 уровня x 3 колонки)
                SELECT rack_name, cell_level, cell_column
                FROM (
                    VALUES 
                        ('A1'),('A2'),('A3'),('A4'),('A5'),
                        ('B1'),('B2'),('B3'),('B4'),('B5'),
                        ('C1'),('C2'),('C3'),('C4'),('C5'),
                        ('D1'),('D2'),('D3'),('D4'),('D5'),
                        ('E1'),('E2'),('E3'),('E4'),('E5')
                ) racks(rack_name)
                CROSS JOIN (VALUES (1),(2),(3)) levels(cell_level)
                CROSS JOIN (VALUES (1),(2),(3)) columns(cell_column)
            ) all_cells
            LEFT JOIN tbl_RackPlacement rp 
                ON rp.rack_name = all_cells.rack_name 
                AND rp.cell_level = all_cells.cell_level 
                AND rp.cell_column = all_cells.cell_column
            WHERE 1=1
                AND NOT (all_cells.rack_name = @excludeRack 
                    AND all_cells.cell_level = @excludeLevel 
                    AND all_cells.cell_column = @excludeColumn)
        `;
        
        const request = dbPool.request();
        request.input('deviceId', sql.Int, parseInt(deviceId));
        request.input('excludeRack', sql.NVarChar, excludeRack);
        request.input('excludeLevel', sql.Int, parseInt(excludeLevel));
        request.input('excludeColumn', sql.Int, parseInt(excludeColumn));
        
        const result = await request.query(query);
        
        // Группируем по стеллажам
        const racks = {};
        result.recordset.forEach(cell => {
            if (!racks[cell.rack_name]) {
                racks[cell.rack_name] = [];
            }
            racks[cell.rack_name].push(cell);
        });
        
        res.json({
            success: true,
            racks: racks
        });
        
    } catch (error) {
        console.error('Ошибка получения доступных ячеек:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/warehouse/update-device-location', verifyToken, async (req, res) => {
    const { deviceId } = req.body;
    
    try {
        // Получаем все места размещения прибора
        const placementResult = await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .query(`
                SELECT 
                    rp.rack_name,
                    SUM(rp.quantity) as total_quantity
                FROM tbl_RackPlacement rp
                WHERE rp.device_id = @deviceId
                GROUP BY rp.rack_name
                ORDER BY rp.rack_name
            `);
        
        // Формируем строку местоположения
        let locationText = '';
        if (placementResult.recordset.length > 0) {
            const locations = placementResult.recordset.map(r => 
                `${r.rack_name}: ${r.total_quantity} шт.`
            );
            locationText = locations.join(', ');
        } else {
            locationText = 'Не размещен';
        }
        
        await dbPool.request()
            .input('deviceId', sql.Int, deviceId)
            .input('location', sql.NVarChar, locationText)
            .query(`
                UPDATE tbl_Stock 
                SET location = @location,
                    last_updated = GETDATE()
                WHERE device_id = @deviceId
            `);
        
        res.json({
            success: true,
            location: locationText,
            placements: placementResult.recordset
        });
        
    } catch (error) {
        console.error('Ошибка обновления местоположения:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/warehouse/update-all-device-locations', verifyToken, async (req, res) => {
    try {
        // Получаем все приборы, у которых есть размещение
        const devicesResult = await dbPool.request()
            .query(`
                SELECT DISTINCT rp.device_id
                FROM tbl_RackPlacement rp
                WHERE rp.quantity > 0
            `);
        
        let updatedCount = 0;
        
        for (const device of devicesResult.recordset) {
            // Получаем размещения для каждого прибора
            const placementResult = await dbPool.request()
                .input('deviceId', sql.Int, device.device_id)
                .query(`
                    SELECT 
                        rp.rack_name,
                        SUM(rp.quantity) as total_quantity
                    FROM tbl_RackPlacement rp
                    WHERE rp.device_id = @deviceId
                    GROUP BY rp.rack_name
                    ORDER BY rp.rack_name
                `);
            
            let locationText = '';
            if (placementResult.recordset.length > 0) {
                const locations = placementResult.recordset.map(r => 
                    `${r.rack_name}: ${r.total_quantity} шт.`
                );
                locationText = locations.join(', ');
            } else {
                locationText = 'Не размещен';
            }
            
            await dbPool.request()
                .input('deviceId', sql.Int, device.device_id)
                .input('location', sql.NVarChar, locationText)
                .query(`
                    UPDATE tbl_Stock 
                    SET location = @location,
                        last_updated = GETDATE()
                    WHERE device_id = @deviceId
                `);
            
            updatedCount++;
        }
        
        res.json({
            success: true,
            message: `Обновлено местоположение для ${updatedCount} приборов`,
            updatedCount: updatedCount
        });
        
    } catch (error) {
        console.error('Ошибка массового обновления:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
const PORT = process.env.PORT || 5000;

async function startServer() {
    console.log('='.repeat(70));
    console.log('🚀 ЗАПУСК СЕРВЕРА АТОМТЕХ СКЛАД');
    console.log('='.repeat(70));
    
    await connectDB();
    
    app.listen(PORT, () => {
        console.log('='.repeat(70));
        console.log(`✅ СЕРВЕР УСПЕШНО ЗАПУЩЕН!`);
        console.log('='.repeat(70));
        console.log(`📡 ЛОКАЛЬНЫЙ АДРЕС: http://localhost:${PORT}`);
        console.log('='.repeat(70));
        console.log(`📁 Клиентская папка: ${clientPath}`);
        console.log(`🗄️  База данных: ${isDatabaseConnected ? '✅ ПОДКЛЮЧЕНА' : '❌ НЕ ПОДКЛЮЧЕНА'}`);
        console.log('='.repeat(70));
        console.log('\n🔐 ТЕСТОВЫЕ УЧЕТНЫЕ ЗАПИСИ:');
        console.log('   admin@atomtech.by / admin123 - Заведующий склада');
        console.log('   manager@atomtech.by / manager123 - Менеджер по продажам');
        console.log('   employee@atomtech.by / employee123 - Кладовщик');
        console.log('='.repeat(70));
        console.log(`\n👉 ОТКРОЙТЕ В БРАУЗЕРЕ: http://localhost:${PORT}`);
        console.log('='.repeat(70));
    });
}

startServer();