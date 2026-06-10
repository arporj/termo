import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'verify'>('request'); // 'request' = digita email, 'verify' = digita codigo de 6 digitos
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Envia e-mail com link de login / código OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    if (!supabase) {
      // Caso o Supabase não esteja configurado, oferecemos um fluxo Mock para demonstração da UI
      setTimeout(() => {
        setLoading(false);
        setStep('verify');
        setInfoMsg('Modo Demo: Digite qualquer código de 6 dígitos para logar localmente.');
      }, 1000);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      setStep('verify');
      setInfoMsg('Código enviado! Verifique seu e-mail (e a pasta de spam).');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar código de acesso.');
    } finally {
      setLoading(false);
    }
  };

  // Valida o código OTP inserido pelo usuário
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setLoading(true);
    setErrorMsg(null);

    if (!supabase) {
      // Mock de login no modo de demonstração local
      setTimeout(() => {
        setLoading(false);
        onAuthSuccess(email);
        onClose();
      }, 1000);
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email'
      });

      if (error) throw error;

      if (data?.user?.email) {
        onAuthSuccess(data.user.email);
        onClose();
      } else {
        throw new Error('Não foi possível obter os dados do usuário.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Código incorreto ou expirado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <button onClick={onClose} className="modal-close">
          <X size={20} />
        </button>

        <h2 className="modal-title">
          {step === 'request' ? 'Salvar Estatísticas na Nuvem' : 'Verificação de Código'}
        </h2>

        {errorMsg && (
          <div className="btn" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            marginBottom: '1rem',
            width: '100%',
            cursor: 'default'
          }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="btn" style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            marginBottom: '1rem',
            width: '100%',
            cursor: 'default'
          }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.85rem' }}>{infoMsg}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Digite um e-mail válido para sincronizar sua sequência entre dispositivos.
              </label>
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Mail size={18} />
              {loading ? 'Enviando...' : 'Receber Código por E-mail'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Insira o código de 6 dígitos enviado para <strong>{email}</strong>
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="form-input"
                maxLength={6}
                pattern="\d*"
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.25rem' }}
                required
                disabled={loading}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStep('request')}
                className="btn"
                style={{ flex: 1 }}
                disabled={loading}
              >
                Voltar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'Confirmando...' : 'Confirmar Acesso'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-msg" style={{ marginTop: '1.5rem', fontSize: '0.75rem' }}>
          * O jogo é 100% gratuito e não exige senhas. Usando o e-mail, suas sequências (streaks) nunca serão perdidas ao limpar os dados do navegador.
        </div>
      </div>
    </div>
  );
};
