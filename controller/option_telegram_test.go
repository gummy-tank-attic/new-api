package controller

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTelegramOptionTestDB(t *testing.T) {
	t.Helper()
	previousDB := model.DB
	previousLogDB := model.LOG_DB
	previousType := common.MainDatabaseType()
	previousRedisEnabled := common.RedisEnabled
	previousToken := common.TelegramBotToken
	previousName := common.TelegramBotName
	previousOptionMap := common.OptionMap
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&model.Option{}, &model.User{}, &model.Log{}))
	model.DB = db
	model.LOG_DB = db
	common.SetMainDatabaseType(common.DatabaseTypeSQLite)
	common.RedisEnabled = false
	common.OptionMap = map[string]string{
		"TelegramBotToken": previousToken,
		"TelegramBotName":  previousName,
	}
	require.NoError(t, db.Create(&model.User{Id: 1, Username: "admin"}).Error)
	t.Cleanup(func() {
		model.DB = previousDB
		model.LOG_DB = previousLogDB
		common.SetMainDatabaseType(previousType)
		common.RedisEnabled = previousRedisEnabled
		common.TelegramBotToken = previousToken
		common.TelegramBotName = previousName
		common.OptionMap = previousOptionMap
	})
}

func stubTelegramBotName(t *testing.T, fetch func(context.Context, string) (string, error)) {
	t.Helper()
	previous := fetchTelegramBotName
	fetchTelegramBotName = fetch
	t.Cleanup(func() {
		fetchTelegramBotName = previous
	})
}

func performUpdateOption(body string) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(response)
	context.Set("id", 1)
	context.Request = httptest.NewRequest(http.MethodPut, "/api/option/", strings.NewReader(body))
	UpdateOption(context)
	return response
}

func TestUpdateOptionTelegramBotTokenBackfillsBotName(t *testing.T) {
	setupTelegramOptionTestDB(t)
	stubTelegramBotName(t, func(_ context.Context, token string) (string, error) {
		assert.Equal(t, "telegram-test-token", token)
		return "metartr_bot", nil
	})

	response := performUpdateOption(`{"key":"TelegramBotToken","value":" telegram-test-token "}`)

	assert.Equal(t, http.StatusOK, response.Code)
	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	assert.True(t, payload.Success)
	assert.Empty(t, payload.Message)
	assert.Equal(t, "telegram-test-token", common.TelegramBotToken)
	assert.Equal(t, "metartr_bot", common.TelegramBotName)

	var tokenOption model.Option
	require.NoError(t, model.DB.First(&tokenOption, "key = ?", "TelegramBotToken").Error)
	assert.Equal(t, "telegram-test-token", tokenOption.Value)
	var nameOption model.Option
	require.NoError(t, model.DB.First(&nameOption, "key = ?", "TelegramBotName").Error)
	assert.Equal(t, "metartr_bot", nameOption.Value)
}

func TestUpdateOptionTelegramBotTokenRejectsInvalidTokenWithoutPersisting(t *testing.T) {
	setupTelegramOptionTestDB(t)
	require.NoError(t, model.UpdateOptionsBulk(map[string]string{
		"TelegramBotToken": "old-token",
		"TelegramBotName":  "old_bot",
	}))
	stubTelegramBotName(t, func(_ context.Context, _ string) (string, error) {
		return "", errors.New("invalid token")
	})

	response := performUpdateOption(`{"key":"TelegramBotToken","value":"bad-token"}`)

	assert.Equal(t, http.StatusOK, response.Code)
	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	assert.False(t, payload.Success)
	assert.Contains(t, payload.Message, "无法通过 Telegram Bot Token 获取 Bot Name")
	assert.Equal(t, "old-token", common.TelegramBotToken)
	assert.Equal(t, "old_bot", common.TelegramBotName)
}

func TestUpdateOptionTelegramOAuthEnabledBackfillsMissingBotName(t *testing.T) {
	setupTelegramOptionTestDB(t)
	common.TelegramBotToken = "existing-token"
	common.TelegramBotName = ""
	stubTelegramBotName(t, func(_ context.Context, token string) (string, error) {
		assert.Equal(t, "existing-token", token)
		return "existing_bot", nil
	})

	response := performUpdateOption(`{"key":"TelegramOAuthEnabled","value":true}`)

	assert.Equal(t, http.StatusOK, response.Code)
	var payload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	assert.True(t, payload.Success)
	assert.Equal(t, "existing_bot", common.TelegramBotName)
}
