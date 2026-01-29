import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Import app components 
from app.main import app
from app.database import Base, get_db
from app.seed import db_seed
from app import models

# Test DB URL
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEST_DATABASE_PATH = os.path.join(BACKEND_DIR, 'test.db')
TEST_DATABASE_URL = f"sqlite:///{TEST_DATABASE_PATH}"

engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    if os.path.exists(TEST_DATABASE_PATH):
        try:
            os.remove(TEST_DATABASE_PATH)
        except:
            pass
            
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        db_seed(db=db, db_engine=engine)
        db.commit()
    except Exception as e:
        print(f"Seeding failed: {e}")
    finally:
        db.close()
        
    yield
    
    if os.path.exists(TEST_DATABASE_PATH):
        try:
            os.remove(TEST_DATABASE_PATH)
        except:
            pass

@pytest.fixture(scope="function")
def db():
    """
    Provides a transactional scope around each test.
    Any data created during the test will be rolled back.
    """
    connection = engine.connect()
    # Begin a non-ORM transaction
    transaction = connection.begin()
    # Bind a session to the connection
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    # Teardown: rollback and close
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()
