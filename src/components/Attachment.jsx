import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip } from "lucide-react";

import { useStore } from "../store/useStore";
import { formatBytes } from "../utils/format";
import {
  MAX_ATTACHMENT_BYTES,
  uploadAttachment,
} from "../data/remoteSync";

/**
 * Pulsante "allega file": carica su Supabase Storage e passa l'allegato
 * (url, nome, dimensione, tipo) al chiamante, che lo invia nel messaggio.
 */
export function AttachmentPicker({ conversationId, onUploaded, disabled }) {
  const { remoteConfig, remoteStatus } = useStore();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleChange(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || uploading) return;

    if (remoteStatus === "idle" || !remoteConfig?.url) {
      setError("Collega il cloud per inviare allegati.");

      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("L'allegato supera il limite di 4 MB.");

      return;
    }

    setError(null);
    setUploading(true);

    try {
      const attachment = await uploadAttachment(remoteConfig, {
        conversationId,
        file,
      });

      onUploaded(attachment);
    } catch (uploadError) {
      setError(String(uploadError?.message ?? uploadError));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" hidden onChange={handleChange} />

      <button
        type="button"
        className="attach-button"
        title="Allega un file (max 4 MB)"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 size={18} className="spin" />
        ) : (
          <Paperclip size={18} />
        )}
      </button>

      {error && <span className="attach-error">{error}</span>}
    </>
  );
}

/** Allegato dentro una bolla: immagine inline o chip per gli altri file. */
export function AttachmentView({ attachment }) {
  if (!attachment?.url) return null;

  if (attachment.type?.startsWith("image/")) {
    return (
      <img
        className="attachment-image"
        src={attachment.url}
        alt={attachment.name ?? "allegato"}
        onClick={() => window.open(attachment.url, "_blank", "noreferrer")}
      />
    );
  }

  return (
    <a
      className="attachment-file"
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
    >
      <FileText size={18} />
      <span>{attachment.name ?? "allegato"}</span>
      <em>{formatBytes(attachment.size)}</em>
    </a>
  );
}
