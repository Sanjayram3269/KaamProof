from pydantic_settings import BaseSettings,SettingsConfigDict
class Settings(BaseSettings):
 model_config=SettingsConfigDict(env_file=".env",extra="ignore")
 database_url:str="sqlite:///./kaamproof.db"
 jwt_secret:str="development-secret-change-me-please-123456"
 jwt_expire_minutes:int=60
 cors_origins:str="http://localhost:3000"
 web_origin:str="http://localhost:3000"
 upload_dir:str="./storage"
 max_upload_mb:int=8
 customer_link_days:int=7
 @property
 def cors_list(self):return [x.strip() for x in self.cors_origins.split(",") if x.strip()]
settings=Settings()
