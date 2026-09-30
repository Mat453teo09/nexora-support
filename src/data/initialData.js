/**
 * Dati iniziali del sistema NEXORA Support (produzione).
 *
 * Nessuna chat demo: le conversazioni nascono solo dai clienti reali.
 * Gli account staff partono tutti attivi e offline: la presenza passa
 * a "online" automaticamente al momento del login.
 */

export const OWNER_ACCOUNT = {
  id: "owner",
  username: "owner",
  password: "Nexora2026!",
  displayName: "Sofy_2012",
  role: "OWNER",
  active: true,
  createdAt: 0,
};

const OPERATOR_PASSWORDS = [
  "Vela#7291",
  "Tram#3485",
  "Corno#6172",
  "Mega#9346",
  "Sasso#2518",
  "Falco#7803",
  "Nero#4159",
  "Delta#5297",
  "Riva#8634",
  "Lume#1726",
  "Onda#3958",
  "Pico#6471",
  "Sera#2814",
  "Telo#9365",
];

export const initialOperators = Array.from({ length: 14 }, (_, index) => {
  const number = index + 1;

  return {
    id: `operator-${number}`,
    username: `operator${number}`,
    password: OPERATOR_PASSWORDS[index],
    displayName: `Operator ${number}`,
    role: "OPERATOR",
    active: true,
    online: false,
    createdAt: Date.now() + index,
  };
});

export const initialCustomers = [];

export const initialConversations = [];
