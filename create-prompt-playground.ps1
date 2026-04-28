$content = @"
import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { checkConsent } from '../services/consent-service';
import { UsageType, Decision, type ConsentCheckResponse } from '../types/api-types';
import styles from './PromptPlayground.module.css';

export const PromptPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [actionType, setActionType] = useState<UsageType>(UsageType.GENERAL_GENERATION);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsentCheckResponse | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
      setError(null);
    }
  };

  const handleRunConsentCheck = async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await checkConsent(
        image,
        actionType,
        'prompt-playground-demo'
      );
      
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to check consent');
    } finally {
      setLoading(false);
    }
  };
"@

$content | Out-File -FilePath "likenessguard-dashboard/src/pages/PromptPlayground.tsx" -Encoding UTF8 -NoNewline
