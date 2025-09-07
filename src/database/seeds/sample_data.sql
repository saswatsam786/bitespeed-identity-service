-- Sample data for testing
INSERT INTO contacts (phone_number, email, linked_id, link_precedence, created_at) VALUES
('123456', 'lorraine@hillvalley.edu', NULL, 'primary', '2023-04-01 00:00:00.374+00'),
('919191', 'george@hillvalley.edu', NULL, 'primary', '2023-04-11 00:00:00.374+00'),
('717171', 'biffsucks@hillvalley.edu', NULL, 'primary', '2023-04-21 05:30:00.11+00');

INSERT INTO contacts (phone_number, email, linked_id, link_precedence, created_at) VALUES
('9876543210', 'loaine@hillvalley.edu', NULL, 'primary', '2023-04-01 00:00:00');

INSERT INTO contacts (phone_number, email, linked_id, link_precedence, created_at) VALUES
('2876543210', 'larry@hillvalley.edu', 1, 'secondary', '2023-04-01 00:00:00');

INSERT INTO contacts (phone_number, email, linked_id, link_precedence, created_at) VALUES
('1876543210', 'george@hillvalley.edu', 1, 'secondary', '2023-04-01 00:00:00');

INSERT INTO contacts (phone_number, email, linked_id, link_precedence, created_at) VALUES
('2876543210', 'elaine@hillvalley.edu', 1, 'secondary', '2023-04-01 00:00:00');