'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Home, Mail, Phone, MapPin } from 'lucide-react';

const ContactPage: React.FC = () => {
  const t = useTranslations('contact');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Contact form submitted:', formData);
      setFormStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setFormStatus('error');
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl bg-white/10 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg p-8 md:p-12 border border-white/10">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-10 text-slate-900 dark:text-slate-50">
          {t('pageTitle')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Form */}
          <div>
            <h2 className="text-xl font-bold mb-5 text-slate-100">{t('formTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('name')}</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className={inputClasses} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('email')}</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className={inputClasses} />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('subject')}</label>
                <select id="subject" name="subject" value={formData.subject} onChange={handleChange} required className={inputClasses}>
                  <option value="">{t('selectSubject')}</option>
                  <option value="general">{t('subjectGeneral')}</option>
                  <option value="contribution">{t('subjectContribute')}</option>
                  <option value="technical">{t('subjectSupport')}</option>
                  <option value="feedback">{t('subjectFeedback')}</option>
                  <option value="other">{t('subjectOther')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{t('message')}</label>
                <textarea id="message" name="message" rows={5} value={formData.message} onChange={handleChange} required className={`${inputClasses} resize-y`} />
              </div>
              <button
                type="submit"
                disabled={formStatus === 'submitting'}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {formStatus === 'submitting' ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> {t('sending')}</>
                ) : t('send')}
              </button>
              {formStatus === 'success' && <p className="text-center text-emerald-600 dark:text-emerald-400">{t('success')}</p>}
              {formStatus === 'error' && <p className="text-center text-red-600 dark:text-red-400">{t('error')}</p>}
            </form>
          </div>

          {/* Contact Info */}
          <div className="bg-white/10/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-600">
            <h2 className="text-xl font-bold mb-5 text-slate-100">{t('infoTitle')}</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail size={22} className="text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100">{t('emailLabel')}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">info@juhuriheritage.org</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone size={22} className="text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100">{t('phoneLabel')}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">{t('phoneHint')}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin size={22} className="text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-100">{t('locationLabel')}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">{t('location')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            <Home size={18} />
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
