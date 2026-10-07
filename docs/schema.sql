-- Initial PostgreSQL schema; generated from SQLAlchemy metadata.

CREATE TABLE companies (
	id VARCHAR(80) NOT NULL, 
	version INTEGER NOT NULL, 
	settings JSON NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE analysis_runs (
	id VARCHAR(80) NOT NULL, 
	company_id VARCHAR(80) NOT NULL, 
	kind VARCHAR(30) NOT NULL, 
	created_at VARCHAR(40) NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(company_id) REFERENCES companies (id)
);

CREATE TABLE employees (
	id VARCHAR(80) NOT NULL, 
	company_id VARCHAR(80) NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(company_id) REFERENCES companies (id)
);

CREATE TABLE portfolios (
	id VARCHAR(80) NOT NULL, 
	company_id VARCHAR(80) NOT NULL, 
	assigned_to VARCHAR(80) NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(company_id) REFERENCES companies (id), 
	FOREIGN KEY(assigned_to) REFERENCES employees (id)
);
