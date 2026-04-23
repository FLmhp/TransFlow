/**
 * Popup styles — generated at runtime via goober (CSS‑in‑JS).
 *
 * goober's `css` helper returns a hashed class name for each style block and
 * injects the corresponding CSS into a single `<style>` element in <head>.
 * Because class names are hashed they cannot collide with host‑page styles;
 * this gives us Tailwind‑like collocation without an extra build step and
 * without exposing global selectors.
 */
import { css, glob } from "goober";

// Global reset + body styles. `glob` writes the CSS verbatim (no hashing) so
// it must only be used for rules that are intentionally global.
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
    background: #f8f9fa;
    color: #212529;
    min-width: 320px;
  }
`;

export const popupContainer = css`
  width: 320px;
  padding: 0 0 12px;
`;

export const popupLoading = css`
  padding: 40px;
  text-align: center;
  color: #6c757d;
`;

export const popupHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
  color: #fff;
`;

export const logo = css`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const logoIcon = css`
  font-size: 20px;
`;

export const logoText = css`
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

/**
 * The toggle switch is made of two collaborating elements (`input` + `slider`)
 * and relies on the sibling combinator `input:checked + .slider`. We generate
 * a stable class name for the slider via goober and reference it from the
 * wrapper's own nested rules using the interpolated selector.
 */
export const slider = css`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  transition: background 0.3s;

  &::before {
    content: "";
    position: absolute;
    width: 18px;
    height: 18px;
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
  width: 46px;
  height: 24px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  input:checked + .${slider} {
    background: rgba(255, 255, 255, 0.6);
  }
  input:checked + .${slider}::before {
    transform: translateX(22px);
  }
`;

export const statusBar = css`
  padding: 6px 16px;
  background: #e8f0fe;
  font-size: 12px;
  color: #1a73e8;
  border-bottom: 1px solid #d2e3fc;

  &.active {
    background: #e6f4ea;
    color: #188038;
    border-bottom-color: #ceead6;
  }
`;

export const section = css`
  padding: 12px 16px 6px;
  border-bottom: 1px solid #e9ecef;
`;

export const sectionLabel = css`
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6c757d;
  margin-bottom: 8px;
`;

export const row = css`
  display: flex;
  align-items: flex-end;
  gap: 8px;
`;

export const field = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 11px;
    color: #6c757d;
    font-weight: 500;
  }
  select {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }
  select:focus {
    border-color: #1a73e8;
  }
`;

export const swapArrow = css`
  font-size: 18px;
  cursor: pointer;
  color: #6c757d;
  padding-bottom: 4px;
  transition:
    color 0.2s,
    transform 0.3s;
  user-select: none;

  &:hover {
    color: #1a73e8;
    transform: rotate(180deg);
  }
`;

export const engineGrid = css`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
`;

export const engineIcon = css`
  font-size: 18px;
`;

export const engineOption = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
  font-size: 12px;
  text-align: center;

  input {
    display: none;
  }
  &.selected {
    border-color: #1a73e8;
    background: #e8f0fe;
    color: #1a73e8;
    font-weight: 600;
  }
`;

export const featureList = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const featureItem = css`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 0;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #1a73e8;
  }
`;

export const popupActions = css`
  display: flex;
  gap: 8px;
  padding: 12px 16px 4px;
`;

const buttonBase = `
  flex: 1;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.1s;

  &:active {
    transform: scale(0.97);
  }
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
  color: #444;

  &:hover {
    background: #e2e5e8;
  }
`;
