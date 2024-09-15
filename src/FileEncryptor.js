import React, { useState, useEffect } from 'react';
import './FileEncryptor.css';

const FileEncryptor = () => {
  const [file, setFile] = useState(null);
  const [encryptedFile, setEncryptedFile] = useState(null);
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [encryptedSymmetricKey, setEncryptedSymmetricKey] = useState(null);
  const [encryptedBase64, setEncryptedBase64] = useState(null);

  // Генерация ключей при монтировании компонента
  useEffect(() => {
    const generateKeyPair = async () => {
      try {
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"]
        );
        setPublicKey(keyPair.publicKey);
        setPrivateKey(keyPair.privateKey);
        console.log("Ключи успешно сгенерированы.");
      } catch (error) {
        console.error('Ошибка генерации ключей:', error);
      }
    };

    generateKeyPair();
  }, []);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    setFile(file);
    const reader = new FileReader();
    reader.onload = async () => {
      const fileContent = reader.result; // ArrayBuffer
      await encryptFile(fileContent);
    };
    reader.readAsArrayBuffer(file);
  };

  // Генерация симметричного ключа AES
  const generateSymmetricKey = async () => {
    try {
      const symmetricKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );
      return symmetricKey;
    } catch (error) {
      console.error('Ошибка генерации симметричного ключа:', error);
    }
  };

  // Шифрование симметричного ключа с помощью RSA
  const encryptSymmetricKey = async (symmetricKey) => {
    try {
      const symmetricKeyData = await window.crypto.subtle.exportKey('raw', symmetricKey);
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        publicKey,
        symmetricKeyData
      );
      setEncryptedSymmetricKey(encryptedKey);
      return encryptedKey;
    } catch (error) {
      console.error('Ошибка шифрования симметричного ключа:', error);
    }
  };

  // Шифрование файла с использованием AES
  const encryptFile = async (fileContent) => {
    if (!publicKey) {
      console.error('Публичный ключ не доступен.');
      return;
    }

    try {
      // Генерация симметричного ключа
      const symmetricKey = await generateSymmetricKey();
      console.log('Симметричный ключ сгенерирован.');

      // Шифрование файла с симметричным ключом (AES)
      const encryptedFile = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(12), // случайный вектор инициализации (IV)
        },
        symmetricKey,
        fileContent
      );

      setEncryptedFile(encryptedFile);

      // Шифрование симметричного ключа с RSA
      const encryptedSymmetricKey = await encryptSymmetricKey(symmetricKey);
      console.log('Симметричный ключ зашифрован.');

      const base64String = arrayBufferToBase64(encryptedFile);
      setEncryptedBase64(base64String);
    } catch (error) {
      console.error('Ошибка шифрования:', error);
    }
  };

  const decryptFile = async () => {
    if (!encryptedFile || !privateKey || !encryptedSymmetricKey) {
      console.error('Приватный ключ, зашифрованные данные или зашифрованный симметричный ключ не найдены.');
      return;
    }

    try {
      // Расшифровка симметричного ключа
      const symmetricKeyData = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        privateKey,
        encryptedSymmetricKey
      );

      const symmetricKey = await window.crypto.subtle.importKey(
        'raw',
        symmetricKeyData,
        {
          name: 'AES-GCM',
        },
        true,
        ['decrypt']
      );

      console.log('Симметричный ключ расшифрован.');

      // Расшифровка файла
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(12), // тот же IV, который использовался при шифровании
        },
        symmetricKey,
        encryptedFile
      );
      setDecryptedFile(decrypted);
      console.log('Файл расшифрован.');
    } catch (error) {
      console.error('Ошибка расшифровки:', error);
    }
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const downloadDecryptedFile = () => {
    const blob = new Blob([decryptedFile], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'decrypted_file';
    link.click();
  };

  return (
    <div className="file-encryptor-container">
      <h1>Загрузите файл для шифрования</h1>
      <label htmlFor="file-upload">Выбрать файл</label>
      <input id="file-upload" type="file" onChange={(e) => onDrop(e.target.files)} />
      {file && <p>Загружен файл: {file.name}</p>}

      {encryptedBase64 && (
        <>
          <h3>Зашифрованные данные (Base64):</h3>
          <textarea value={encryptedBase64} readOnly rows="10" cols="50" />
        </>
      )}

      {encryptedFile && (
        <button onClick={decryptFile}>
          Расшифровать файл
        </button>
      )}

      {decryptedFile && (
        <button onClick={downloadDecryptedFile}>
          Скачать расшифрованный файл
        </button>
      )}
    </div>
  );
};

export default FileEncryptor;
