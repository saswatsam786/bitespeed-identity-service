-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    linked_id INTEGER REFERENCES contacts(id),
    link_precedence VARCHAR(20) NOT NULL CHECK (link_precedence IN ('primary', 'secondary')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_linked_id ON contacts(linked_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_link_precedence ON contacts(link_precedence) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at 
    BEFORE UPDATE ON contacts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();