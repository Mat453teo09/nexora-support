/**
 * Dati iniziali del sistema.
 *
 * SECURITY NOTE: le password NON esistono in chiaro nel codice — solo
 * hash SHA-256 con salt applicativo (vedi src/utils/hash.js, schema
 * "nexora:v1:<password>"). Il login confronta hash con hash.
 *
 * Le password iniziali sono state consegnate all'owner in chat e sono
 * modificabili dal pannello (sezione Operatori / Il mio profilo).
 */

export const OWNER_ACCOUNT = {
  id: "user-owner",
  username: "owner",
  passwordHash:
    "df8f592d033645bf2a2b1c5bf598ef46d75384e65d2255b016c78294bb57a97e",
  displayName: "Sofy_2012",
  role: "OWNER",
  active: true,
  online: false,
  createdAt: 0,
};

const OPERATOR_HASHES = {
  operator1: "328f326732ccc70bbc75bc7a05a871934e36788a339ae31e498f0dd7e0176c83",
  operator2: "21b109b6d30b63857ea3ebce2cf54ded649f0d726d77e05c0b5e92e1e667bd2f",
  operator3: "74c1daefd6e0f2d767d51847f759a5162ff6bf0fe135714776cbfd79e4caa797",
  operator4: "65ca1ad5d3a382a38335d13030a8452a6e5d69d9f188dc4dcb0c17a565cbd983",
  operator5: "a99c04aa2b09d9fa01a5219c832cad63a0ec5f2a065bc35d7092921c334e7abd",
  operator6: "4f4e643316bb15695314c2641161550fcb0831f318f0cbc1240a424f05e67993",
  operator7: "05c6dd41a6909470610063cb3668c27061a2d6907668b52ae3a3c246d2fe1f7c",
  operator8: "6332c9f6e4713c38bac65215b047c989b8a245b91e1ba282cc5e0a7a46cf6dba",
  operator9: "73d6b6cab985a41b74ef1be26b54dce285f7d0e74a2cd5fa638cf680508c4e17",
  operator10: "1f338be73bd7a0df440660ce1dd09b5c4eba41d6ccc39abc6b639cd7b62252ea",
  operator11: "bd7c62860e52bd006f6ac47c83676e3e6ebfdc41047f32b5914070811b8a5ad3",
  operator12: "44a903622da0d721a339c74db05399b79b0619b71e5a0b3f916847af9f0ab7c4",
  operator13: "b66f4bf3fc8ba6977d2ef6314498f95ee73e57bcd67657302e497404eaea7dbd",
  operator14: "5e7e01424eee8658e68464cc6404620b42f18b273d16927250b1f98c0f4e24cc",
};

export const initialOperators = Object.entries(OPERATOR_HASHES).map(
  ([username, passwordHash], index) => ({
    id: `user-operator-${index + 1}`,
    username,
    passwordHash,
    displayName: `Operator ${index + 1}`,
    role: "OPERATOR",
    active: true,
    online: false,
    createdAt: 0,
  }),
);

export const initialCustomers = [];
