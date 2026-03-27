#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Otomatik Şifre Üretim Sistemi
GG*AA*YY+YY (Sabah) ve GG*AA*YY-YYYY (Akşam) formatında
"""

from datetime import datetime, timedelta
import pandas as pd
import os

class PasswordGenerator:
    def __init__(self):
        self.current_date = datetime.now()
    
    def generate_password(self, date=None):
        """
        Belirtilen tarih için şifre üretir
        date: datetime objesi (None ise bugün)
        """
        if date is None:
            date = self.current_date
        
        # Tarih bilgilerini al
        day = date.day
        month = date.month
        year_short = date.year % 100  # Son 2 hane
        year_full = date.year
        
        # Saat kontrolü
        hour = date.hour
        
        if hour < 13:  # Sabah (00:00 - 12:59)
            # Format: GG*AA*YY+GG*GG
            password = (day * month * year_short) + (day * day)
            format_str = f"{day:02d}*{month:02d}*{year_short:02d}+{day:02d}*{day:02d}"
        else:  # Akşam (13:00 - 23:59)
            # Format: GG*AA*YY-GG*GG
            password = (day * month * year_short) - (day * day)
            format_str = f"{day:02d}*{month:02d}*{year_short:02d}-{day:02d}*{day:02d}"
        
        return {
            'date': date.strftime('%d.%m.%Y'),
            'time_period': 'Sabah' if hour < 13 else 'Akşam',
            'formula': format_str,
            'password': password,
            'hour': f"{hour:02d}:00"
        }
    
    def generate_daily_passwords(self, start_date, end_date):
        """
        Belirtilen tarih aralığı için tüm şifreleri üretir
        """
        passwords = []
        current_date = start_date
        
        while current_date <= end_date:
            # Sabah şifresi (09:00)
            morning_date = current_date.replace(hour=9, minute=0, second=0, microsecond=0)
            morning_password = self.generate_password(morning_date)
            passwords.append(morning_password)
            
            # Akşam şifresi (15:00)
            evening_date = current_date.replace(hour=15, minute=0, second=0, microsecond=0)
            evening_password = self.generate_password(evening_date)
            passwords.append(evening_password)
            
            current_date += timedelta(days=1)
        
        return passwords
    
    def create_excel_file(self, start_year=2025, end_year=2035):
        """
        2035 yılına kadar tüm şifreleri Excel dosyasına yazar
        """
        start_date = datetime(start_year, 1, 1)
        end_date = datetime(end_year, 12, 31)
        
        print(f"Şifreler üretiliyor: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}")
        
        # Tüm şifreleri üret
        all_passwords = self.generate_daily_passwords(start_date, end_date)
        
        # DataFrame oluştur
        df = pd.DataFrame(all_passwords)
        
        # Excel dosyasına yaz
        filename = f"Gunluk_Sifreler_{start_year}-{end_year}.xlsx"
        
        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Günlük Şifreler', index=False)
            
            # Sayfa formatlaması
            workbook = writer.book
            worksheet = writer.sheets['Günlük Şifreler']
            
            # Sütun genişlikleri
            worksheet.column_dimensions['A'].width = 12  # Tarih
            worksheet.column_dimensions['B'].width = 8   # Zaman
            worksheet.column_dimensions['C'].width = 25  # Formül
            worksheet.column_dimensions['D'].width = 15  # Şifre
        
        print(f"Excel dosyası oluşturuldu: {filename}")
        return filename

def main():
    """Ana fonksiyon"""
    print("=== Otomatik Şifre Üretim Sistemi ===")
    print("Format: GG*AA*YY+YY (Sabah) ve GG*AA*YY-YYYY (Akşam)")
    print()
    
    # Şifre üretici oluştur
    generator = PasswordGenerator()
    
    # Bugünün şifresini göster
    today_password = generator.generate_password()
    print("Bugünün Şifresi:")
    print(f"Tarih: {today_password['date']}")
    print(f"Zaman: {today_password['time_period']} ({today_password['hour']})")
    print(f"Formül: {today_password['formula']}")
    print(f"Şifre: {today_password['password']}")
    print()
    
    # Excel dosyası oluştur
    print("Excel dosyası oluşturuluyor...")
    excel_file = generator.create_excel_file(2025, 2035)
    print(f"✅ Excel dosyası hazır: {excel_file}")
    
    # Örnek şifreler göster
    print("\nÖrnek Şifreler:")
    sample_dates = [
        datetime(2025, 1, 15, 9, 0),   # 15 Ocak 2025 sabah
        datetime(2025, 1, 15, 15, 0),  # 15 Ocak 2025 akşam
        datetime(2025, 1, 16, 9, 0),   # 16 Ocak 2025 sabah
        datetime(2025, 1, 16, 15, 0), # 16 Ocak 2025 akşam
    ]
    
    for date in sample_dates:
        pwd = generator.generate_password(date)
        print(f"{pwd['date']} {pwd['time_period']}: {pwd['formula']} = {pwd['password']}")

if __name__ == "__main__":
    main()

