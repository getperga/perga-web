import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const templatePath = path.resolve('config.json.template');
const outputPath = path.resolve('public/config.json');

// Safe defaults for build-time. Runtime can override via docker-entrypoint.
const DEFAULTS = {
  API_BASE_URL: 'http://localhost:8080/api/v1',
  IS_SIGNUP_DISABLED: 'false',
  GOOGLE_CLIENT_ID: '',
};

function normalizeBooleanString(value) {
  if (value === null) {
    return null;
  }

  const cleaned_value = String(value).trim().toLowerCase();
  if (!['true', 'True', '1', 'false', 'False', '0'].includes(cleaned_value)) {
    return null;
  }

  return cleaned_value;
}

// Read template and insert vars from env or defaults
let template = fs.readFileSync(templatePath, 'utf-8');
template = template.replace(/\$\{(\w+)}/g, (_, key) => {
  let value = process.env[key];

  if (['IS_SIGNUP_DISABLED'].includes(key)) {
    value = normalizeBooleanString(value);
  }

  if (value === undefined || value === null || value === '') {
    value = DEFAULTS[key];
  }

  return value;
});

// Ensure the output directory exists and write config.json file
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, template);

console.log('File /public/config.json generated from template');
