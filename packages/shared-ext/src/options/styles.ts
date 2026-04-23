/**
 * Options page styles — generated at runtime via goober (CSS‑in‑JS).
 *
 * See ../popup/styles.ts for an explanation of why goober was chosen over
 * TailwindCSS and solid-styled-components.
 */
import { css, glob } from "goober";

// oxlint-disable-next-line no-unused-expressions -- tagged template side effect
glob`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    background: #f0f2f5;
    color: #212529;
    min-height: 100vh;
  }
`;

export const loading = css`
  padding: 80px;
  text-align: center;
  color: #6c757d;
`;

export const page = css`
  display: flex;
  min-height: 100vh;
`;

export const sidebar = css`
  width: 220px;
  min-height: 100vh;
  background: linear-gradient(160deg, #1a73e8 0%, #0d47a1 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  flex-shrink: 0;
`;

export const sidebarLogo = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 16px 16px;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
`;

export const sidebarNav = css`
  list-style: none;
  padding: 12px 8px;

  li {
    margin-bottom: 4px;
  }
`;

export const navLink = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  &.active {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-weight: 600;
  }
`;

export const navIcon = css`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  opacity: 0.9;
`;

export const content = css`
  flex: 1;
  padding: 32px 40px;
  max-width: 820px;
  position: relative;

  h2 {
    font-size: 22px;
    margin-bottom: 20px;
    color: #1a73e8;
  }
`;

export const card = css`
  background: #fff;
  border-radius: 10px;
  padding: 20px 22px;
  margin-bottom: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    margin-bottom: 14px;
    color: #212529;
  }
`;

export const formRow = css`
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:last-child {
    margin-bottom: 0;
  }
  label {
    font-size: 13px;
    color: #5f6368;
    font-weight: 500;
  }
  select,
  input[type="text"],
  input[type="password"],
  input[type="number"] {
    padding: 8px 10px;
    border: 1px solid #dadce0;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
    outline: none;
    transition: border-color 0.2s;
  }
  select:focus,
  input:focus {
    border-color: #1a73e8;
  }
  input[type="color"] {
    width: 48px;
    height: 36px;
    border: 1px solid #dadce0;
    border-radius: 6px;
    padding: 2px;
    cursor: pointer;
  }
  input[type="range"] {
    width: calc(100% - 48px);
  }

  &.toggle-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

export const rangeLabel = css`
  font-size: 12px;
  color: #5f6368;
`;

export const slider = css`
  position: absolute;
  inset: 0;
  background: #dadce0;
  border-radius: 22px;
  transition: background 0.3s;

  &::before {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    left: 3px;
    bottom: 3px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.3s;
  }
`;

export const toggleSwitch = css`
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  input:checked + .${slider} {
    background: #1a73e8;
  }
  input:checked + .${slider}::before {
    transform: translateX(20px);
  }
`;

export const hint = css`
  font-size: 12px;
  color: #5f6368;
  margin-top: 8px;

  a {
    color: #1a73e8;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

export const previewOriginal = css`
  font-size: 15px;
  color: #212529;
  margin-bottom: 6px;
`;

export const previewTranslation = css`
  padding: 2px 0 2px 8px;

  &.preview-theme-normal {
    border-left: 3px solid var(--transflow-color, #1a73e8);
  }
  &.preview-theme-underline {
    border-left: none;
    padding-left: 0;
    text-decoration: underline;
    text-decoration-color: var(--transflow-color, #1a73e8);
    text-underline-offset: 3px;
  }
  &.preview-theme-dashed {
    border-left: none;
    padding-left: 0;
    text-decoration: underline dashed;
    text-decoration-color: var(--transflow-color, #1a73e8);
    text-underline-offset: 3px;
  }
  &.preview-theme-highlight {
    border-left: none;
    padding: 2px 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--transflow-color, #1a73e8) 18%, transparent);
  }
  &.preview-theme-mask {
    filter: blur(4px);
    transition: filter 0.2s ease;
    border-left: 3px solid var(--transflow-color, #1a73e8);
  }
  &.preview-theme-mask:hover {
    filter: blur(0);
  }
`;

export const featureList = css`
  list-style: none;
  padding-left: 0;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 13px;
    color: #3c4043;
  }
`;

export const saveRow = css`
  display: flex;
  gap: 10px;
  margin-top: 24px;
`;

const buttonBase = `
  padding: 10px 22px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
`;

export const btnPrimary = css`
  ${buttonBase}
  background: #1a73e8;
  color: #fff;

  &:hover {
    background: #1557b0;
  }
`;

export const btnSecondary = css`
  ${buttonBase}
  background: #f1f3f4;
  color: #3c4043;

  &:hover {
    background: #e8eaed;
  }
`;

export const saveBanner = css`
  position: fixed;
  top: 16px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #34a853;
  color: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  font-weight: 500;
  z-index: 100;
`;
