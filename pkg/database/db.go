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
	ID          uint      `json:"id"`
	Name        string    `json:"name" gorm:"not null;default:null"`
	Email       string    `json:"email" gorm:"unique;not null;default:null"`
	ActivatedAt null.Time `json:"activated_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
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

	db.AutoMigrate(&User{})
}
