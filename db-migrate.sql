-- Adicionar novos campos na tabela freight_requests
ALTER TABLE freight_requests 
  ADD COLUMN IF NOT EXISTS origin_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS origin_company_name TEXT,
  ADD COLUMN IF NOT EXISTS origin_zip_code TEXT,
  ADD COLUMN IF NOT EXISTS destination_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS destination_company_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_zip_code TEXT,
  ADD COLUMN IF NOT EXISTS cargo_description TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS destination TEXT;

-- Inserir usuário de exemplo (Transportadora)
INSERT INTO users (username, password, full_name, email, phone, role)
VALUES ('transportadora123', '87bd4c9c26de8ca47498b025a709bc272ed9b67dcc07f8c67eca40c392f74ccd73ac00e2e25cae79a05f04cb5ed2a90a8d1f03880c11e465a44f25ae3f02b013.ba7ca8eb6ac84e6e', 'Transportadora Exemplo LTDA', 'transportadora@exemplo.com', '(11) 99999-9999', 'company')
ON CONFLICT (username) DO NOTHING;

-- Inserir usuário de exemplo (Cliente)
INSERT INTO users (username, password, full_name, email, phone, role)
VALUES ('cliente123', '1f3870be274f6c49b3e31a0c6728957f03420416a938df5de94e89d540619e503b3df6cd204995d6f6e601ecd65bd5399e4f8c26d991e3485a12ea728d94c63d.7e43c1a5e833b5f4', 'Cliente Exemplo', 'cliente@exemplo.com', '(11) 98888-8888', 'client')
ON CONFLICT (username) DO NOTHING;