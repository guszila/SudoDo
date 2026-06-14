import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

import Logo from '../layout/Logo';
import { auth } from '../../firebase';
import { translations } from '../../i18n';

export default function Login({ lang }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Phone Auth State
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countryCode, setCountryCode] = useState('+66');

  const t = translations[lang];

  const formatPhoneNumber = (num) => {
    let cleaned = num.replace(/\s+/g, '').replace(/-/g, '');
    
    // If it starts with + (e.g. +66812345678), keep it as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If it starts with the selected country code without '+' (e.g., 66812345678)
    const codeNoPlus = countryCode.replace('+', '');
    if (cleaned.startsWith(codeNoPlus)) {
      return '+' + cleaned;
    }
    
    // If it starts with '0', strip it (e.g. 0812345678 -> 812345678)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    return countryCode + cleaned;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('กรุณากรอกเบอร์โทรศัพท์');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formattedNum = formatPhoneNumber(phoneNumber);
      
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error('Error clearing recaptcha', e);
        }
        window.recaptchaVerifier = null;
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedNum, appVerifier);
      
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setMessage('ส่งรหัส OTP ไปยังเบอร์โทรศัพท์ของคุณแล้ว');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)');
      } else if (err.code === 'auth/too-many-requests') {
        setError('ระบบส่ง OTP ถี่เกินไป กรุณาลองใหม่ในภายหลัง');
      } else {
        setError('เกิดข้อผิดพลาด: ' + err.message.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setError('กรุณากรอกรหัส OTP');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await confirmationResult.confirm(otpCode);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('รหัส OTP ไม่ถูกต้อง กรุณาลองอีกครั้ง');
      } else {
        setError('เกิดข้อผิดพลาด: ' + err.message.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานแล้ว');
      } else if (err.code === 'auth/weak-password') {
        setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else {
        setError(err.message.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('กรุณากรอกอีเมลของคุณ');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว');
      setTimeout(() => {
        setIsResetPassword(false);
        setMessage(null);
      }, 5000);
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        setError('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (err.code === 'auth/user-not-found') {
        setError('ไม่พบบัญชีที่ใช้อีเมลนี้');
      } else {
        setError(err.message.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans flex items-center justify-center transition-colors duration-300 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key={isResetPassword ? 'reset' : (isLogin ? 'login' : 'signup')}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="liquid-glass-card w-full max-w-md p-8 relative"
        >
          <div className="flex flex-col items-center mb-8">
            <Logo variant="full" size="md" className="w-40 md:w-auto" />
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.2 }}
              className="text-main mt-2 font-medium text-center"
            >
              {isResetPassword ? "รีเซ็ตรหัสผ่านของคุณ" : (isLogin ? "เข้าสู่ระบบเพื่อจัดการตารางงานของคุณ" : "สมัครสมาชิกใหม่เพื่อเริ่มต้นใช้งาน")}
            </motion.p>
          </div>

          {/* Login Method Tabs */}
          {!isResetPassword && (
            <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1 w-full mb-6 border border-main/5">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                  loginMethod === 'email'
                    ? 'bg-[var(--glass-bg-strong)] text-primary-500 shadow-sm border border-[var(--glass-border)]'
                    : 'text-main/60 hover:text-main'
                }`}
              >
                อีเมล (Email)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-[var(--glass-bg-strong)] text-primary-500 shadow-sm border border-[var(--glass-border)]'
                    : 'text-main/60 hover:text-main'
                }`}
              >
                เบอร์โทรศัพท์ (Phone)
              </button>
            </div>
          )}

        {error && (
          <div className="mb-6 p-4 bg-red-50/80 border border-red-200/50 rounded-[16px] flex items-start gap-3 text-red-500 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50/80 border border-green-200/50 rounded-[16px] flex items-start gap-3 text-green-600 backdrop-blur-sm">
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {isResetPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">อีเมล (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                placeholder="you@example.com"
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-[16px] transition-all shadow-[0_4px_16px_0_rgba(108,99,255,0.3)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 border border-white/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsResetPassword(false);
                setError(null);
                setMessage(null);
              }}
              className="w-full text-center text-sm text-primary-500 font-bold hover:underline mt-4"
            >
              กลับไปเข้าสู่ระบบ
            </button>
          </form>
        ) : loginMethod === 'email' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">อีเมล (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="block text-sm font-medium text-main opacity-80">รหัสผ่าน (Password)</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(true);
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-xs text-primary-500 font-bold hover:underline"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-main opacity-50 hover:opacity-100 transition-opacity"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-[16px] transition-all shadow-[0_4px_16px_0_rgba(108,99,255,0.3)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 border border-white/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "เข้าสู่ระบบ (Login)" : "สมัครสมาชิก (Sign Up)")}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-5">
            {!otpSent ? (
              <div>
                <label className="block text-sm font-medium text-main mb-1.5 opacity-80">เบอร์โทรศัพท์ (Phone Number)</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow font-bold text-sm shrink-0 border"
                    style={{ backgroundColor: 'var(--glass-bg-input)', borderColor: 'var(--glass-border)' }}
                  >
                    <option value="+66">🇹🇭 +66</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+60">🇲🇾 +60</option>
                    <option value="+856">🇱🇦 +856</option>
                    <option value="+95">🇲🇲 +95</option>
                    <option value="+855">🇰🇭 +855</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+82">🇰🇷 +82</option>
                  </select>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                    style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                    placeholder="0812345678"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-main mb-1.5 opacity-80">รหัสยืนยัน OTP (6 หลัก)</label>
                <input 
                  type="text" 
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main font-mono text-center text-lg tracking-widest transition-shadow"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder="••••••"
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-[16px] transition-all shadow-[0_4px_16px_0_rgba(108,99,255,0.3)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0 border border-white/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (otpSent ? "ยืนยันรหัส OTP" : "ส่งรหัส OTP")}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode('');
                  setError(null);
                  setMessage(null);
                }}
                className="w-full text-center text-sm text-primary-500 font-bold hover:underline mt-2"
              >
                ย้อนกลับไปแก้ไขเบอร์โทรศัพท์
              </button>
            )}
          </form>
        ) }

        {!isResetPassword && loginMethod === 'email' && (
          <motion.p 
            className="text-center text-sm mt-8 text-main opacity-70"
            layout
          >
            {isLogin ? 'ยังไม่มีบัญชีใช่ไหม? ' : 'มีบัญชีอยู่แล้ว? '}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage(null);
              }}
              className="text-primary-500 font-bold hover:underline"
            >
              {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </button>
          </motion.p>
        )}

        </motion.div>
      </AnimatePresence>
      <div id="recaptcha-container"></div>
    </div>
  );
}
