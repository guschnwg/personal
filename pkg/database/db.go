package database

import (
	"log"
	"os"
	"time"

	"gopkg.in/guregu/null.v4"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var db *gorm.DB

type User struct {
	ID          int       `json:"id"`
	Username    string    `json:"username" gorm:"unique;not null;default:null"`
	ActivatedAt null.Time `json:"activated_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Chat struct {
	ID        int       `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ChatUser struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	ChatID    int       `json:"chat_id"`
	CreatedAt time.Time `json:"created_at"`
}

func DB() *gorm.DB {
	if db != nil {
		return db
	}

	dsn := os.Getenv("DATABASE_URL")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalln(err)
	}

	return db
}

func Migrate(db *gorm.DB) {
	// log.Println(db.Migrator().DropTable(&User{}))

	db.AutoMigrate(&User{}, &Chat{}, &ChatUser{})
}
