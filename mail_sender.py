#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Otomatik Mail Gönderme Sistemi
Her gün şifreleri üretip mail olarak gönderir
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import schedule
import time
import os
from password_generator import PasswordGenerator

class MailSender:
    def __init__(self, email, password, smtp_server="smtp.gmail.com", smtp_port=587):
        """
        Mail gönderici sınıfı
        email: Gönderici email adresi
        password: Email şifresi (App Password önerilir)
        smtp_server: SMTP sunucu adresi
        smtp_port: SMTP port numarası
        """
        self.email = email
        self.password = password
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.password_generator = PasswordGenerator()
    
    def send_daily_passwords(self, recipient_email):
        """
        Günlük şifreleri mail olarak gönderir
        """
        try:
            # Bugünün şifrelerini üret
            today = datetime.now()
            
            # Sabah şifresi (09:00)
            morning_time = today.replace(hour=9, minute=0, second=0, microsecond=0)
            morning_password = self.password_generator.generate_password(morning_time)
            
            # Akşam şifresi (15:00)
            evening_time = today.replace(hour=15, minute=0, second=0, microsecond=0)
            evening_password = self.password_generator.generate_password(evening_time)
            
            # Mail içeriği oluştur
            subject = f"Günlük Şifreler - {today.strftime('%d.%m.%Y')}"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                        🔐 Günlük Şifreler
                    </h2>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #27ae60; margin-top: 0;">📅 Tarih: {today.strftime('%d.%m.%Y')}</h3>
                        <p style="margin: 5px 0;"><strong>Gün:</strong> {today.strftime('%A')}</p>
                        <p style="margin: 5px 0;"><strong>Zaman:</strong> {today.strftime('%H:%M')}</p>
                    </div>
                    
                    <div style="display: flex; gap: 20px; margin: 20px 0;">
                        <!-- Sabah Şifresi -->
                        <div style="flex: 1; background-color: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60;">
                            <h4 style="color: #27ae60; margin-top: 0;">🌅 Sabah Şifresi</h4>
                            <p style="margin: 5px 0;"><strong>Zaman:</strong> 00:00 - 12:59</p>
                            <p style="margin: 5px 0;"><strong>Formül:</strong> {morning_password['formula']}</p>
                            <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">
                                Şifre: {morning_password['password']}
                            </p>
                        </div>
                        
                        <!-- Akşam Şifresi -->
                        <div style="flex: 1; background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #f39c12;">
                            <h4 style="color: #f39c12; margin-top: 0;">🌆 Akşam Şifresi</h4>
                            <p style="margin: 5px 0;"><strong>Zaman:</strong> 13:00 - 23:59</p>
                            <p style="margin: 5px 0;"><strong>Formül:</strong> {evening_password['formula']}</p>
                            <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">
                                Şifre: {evening_password['password']}
                            </p>
                        </div>
                    </div>
                    
                    <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #0c5460; margin-top: 0;">⚠️ Önemli Notlar</h4>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Sabah şifresi saat 13:00'a kadar geçerlidir</li>
                            <li>Akşam şifresi saat 13:00'dan sonra geçerlidir</li>
                            <li>Her gün yeni şifreler üretilir</li>
                            <li>Eski şifreler geçersiz olur</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #7f8c8d; font-size: 12px;">
                            Bu mail otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Mail gönder
            self.send_email(recipient_email, subject, html_content)
            print(f"✅ Günlük şifreler gönderildi: {recipient_email}")
            return True
            
        except Exception as e:
            print(f"❌ Mail gönderimi hatası: {str(e)}")
            return False
    
    def send_email(self, recipient, subject, html_content):
        """
        Email gönderir
        """
        try:
            # Mail oluştur
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.email
            message["To"] = recipient
            
            # HTML içeriği ekle
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)
            
            # SSL bağlantısı oluştur
            context = ssl.create_default_context()
            
            # SMTP sunucusuna bağlan ve mail gönder
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email, self.password)
                server.sendmail(self.email, recipient, message.as_string())
            
            print(f"📧 Mail başarıyla gönderildi: {recipient}")
            
        except Exception as e:
            print(f"❌ Mail gönderme hatası: {str(e)}")
            raise e
    
    def setup_daily_schedule(self, recipient_email, send_time="08:00"):
        """
        Günlük mail gönderim zamanlaması kurar
        """
        schedule.every().day.at(send_time).do(self.send_daily_passwords, recipient_email)
        print(f"⏰ Günlük mail zamanlaması kuruldu: {send_time}")
    
    def run_scheduler(self):
        """
        Zamanlayıcıyı çalıştırır
        """
        print("🔄 Mail zamanlayıcısı başlatıldı...")
        print("⏰ Günlük mail gönderimi aktif")
        print("🛑 Durdurmak için Ctrl+C basın")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Her dakika kontrol et
        except KeyboardInterrupt:
            print("\n🛑 Mail zamanlayıcısı durduruldu")

def main():
    """Ana fonksiyon"""
    print("=== Otomatik Mail Gönderme Sistemi ===")
    print()
    
    # Mail ayarları
    sender_email = input("Gönderici email adresinizi girin: ")
    sender_password = input("Email şifrenizi girin (App Password önerilir): ")
    recipient_email = input("Alıcı email adresini girin: ")
    send_time = input("Mail gönderim saati (HH:MM formatında, varsayılan 08:00): ") or "08:00"
    
    print()
    print("Mail ayarları:")
    print(f"Gönderici: {sender_email}")
    print(f"Alıcı: {recipient_email}")
    print(f"Gönderim saati: {send_time}")
    print()
    
    # Mail gönderici oluştur
    mail_sender = MailSender(sender_email, sender_password)
    
    # Zamanlama kur
    mail_sender.setup_daily_schedule(recipient_email, send_time)
    
    # Test maili gönder
    test_send = input("Test maili göndermek istiyor musunuz? (e/h): ").lower()
    if test_send == 'e':
        print("📧 Test maili gönderiliyor...")
        mail_sender.send_daily_passwords(recipient_email)
    
    # Zamanlayıcıyı başlat
    mail_sender.run_scheduler()

if __name__ == "__main__":
    main()
