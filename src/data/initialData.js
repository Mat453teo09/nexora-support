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
    "e07fb486d0c295d1ca9d69ed2b3fa35aaf9b3967b0e23b3a59848e3586cd49b1",
  displayName: "Sofy_2012",
  role: "OWNER",
  active: true,
  online: false,
  createdAt: 0,
};

const OPERATOR_HASHES = {
  operator1: "814f826cdd178ed445978877f8f51130e2b3e696f73a9097f2482a97b1ce7d52",
  operator2: "4f74d7066bdb7b303893426169a32ceecc043bd296e78e55b3c7c6c63410637c",
  operator3: "597d5628c5644199f88052cd2d0c161adc9d58891c2f558453bc6daec0fb188b",
  operator4: "e3f8c6950c907c3a224936f3254c4c10dba2b66078f5fdcf25daed7e794247d5",
  operator5: "d9f34c0c92028528d9cd610a5a940cecdae39ed8b0e6b6e9ef66a414f4b6c6e7",
  operator6: "bffae6a814704948362ba0c39fb0f86f5c3f0042ec274057d412b8b3a517a04f",
  operator7: "a8bf3a3809890f94c5dcc1fe3c43f5dd84eee3cc787386fe895db8327609a928",
  operator8: "633cef6d1805d94d3dcb633538d0a602a8b3e4ccf74a0bf55b8ce0a715a1b8f9",
  operator9: "9bb0568db81dd1425d9c8d31d047746ea66cf80862f0f503a12117a1184feced",
  operator10: "b7f1c6f2454f2792b2c6f1eb6e9567c67b34068a7a05fbdfd9f11be04c34bca8",
  operator11: "550e2abceae7b44c6e3e264fa3a11947b5f1cdd43435c42eef4f79b1aa051a6d",
  operator12: "c01be1b8d3ca918608b597efe75e52a4ca42e5ee2afccb167bf909130aa6753f",
  operator13: "5bcb42bbf6deff6ec79495a94852577f736197df61f5dfb9e93f8fdde71a8b83",
  operator14: "c53bad916d80bc3adfba3a1f57f020d8df298f212bcf4ef49a5c2dd110739759",
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
