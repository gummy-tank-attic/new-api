package plugins_test

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/pkg/jsplugin"
	builtinplugins "github.com/QuantumNous/new-api/plugins"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDoubaoResponsesProtocol(t *testing.T) {
	testVideoResponsesProtocol(t, videoResponsesTestCase{
		pluginKey: "doubao",
		model:     "doubao-seedance-2-0-260128",
		requestBody: map[string]any{
			"model": "doubao-seedance-2-0-260128",
			"input": []any{map[string]any{"role": "user", "content": []any{
				map[string]any{"type": "input_text", "text": "a running fox"},
				map[string]any{"type": "input_image", "image_url": "https://cdn.example/frame.png"},
			}}},
			"seconds": 6,
			"size":    "1920x1080",
		},
		wantAction: "image_to_video",
		wantRequest: map[string]any{
			"model":   "doubao-seedance-2-0-260128",
			"prompt":  "a running fox",
			"images":  []any{"https://cdn.example/frame.png"},
			"seconds": float64(6),
			"metadata": map[string]any{
				"resolution": "1080p",
			},
		},
		wantUsageKeys:  []string{"resolution", "tokens", "video_input"},
		wantVendorName: "doubao",
	})
}

func TestDoubaoCompletionUsageFacts(t *testing.T) {
	source, err := builtinplugins.Source("doubao")
	require.NoError(t, err)
	plugin, err := jsplugin.NewRegistry().RegisterFactory(source, jsplugin.Options{Key: "doubao"})
	require.NoError(t, err)

	testCases := []struct {
		name string
		body map[string]any
		want map[string]any
	}{
		{
			name: "ark succeeded overlays tokens resolution",
			body: map[string]any{
				"status":     "succeeded",
				"duration":   5,
				"resolution": "720p",
				"usage":      map[string]any{"completion_tokens": 102880, "total_tokens": 102880},
			},
			want: map[string]any{"tokens": float64(102880), "resolution": "720p"},
		},
		{
			name: "tokease completed does not overlay on factory",
			body: map[string]any{
				"status":     "completed",
				"duration":   5,
				"resolution": "720p",
				"usage":      map[string]any{"completion_tokens": 102880},
				"content":    map[string]any{"video_url": "https://example.com/upscale.mp4"},
			},
			want: map[string]any{},
		},
		{
			name: "in progress does not overlay",
			body: map[string]any{"status": "in_progress", "duration": 5, "usage": map[string]any{"completion_tokens": 1}},
			want: map[string]any{},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			value, callErr := plugin.Engine.Call(t.Context(), "extractUsageOnComplete", nil, map[string]any{}, testCase.body)
			require.NoError(t, callErr)
			encoded, marshalErr := common.Marshal(value)
			require.NoError(t, marshalErr)
			var facts map[string]any
			require.NoError(t, common.Unmarshal(encoded, &facts))
			if facts == nil {
				facts = map[string]any{}
			}
			assert.Equal(t, testCase.want, facts)
		})
	}
}

func TestDoubaoUpscaleUsageProfileAndSeconds(t *testing.T) {
	source, err := builtinplugins.Source("doubao")
	require.NoError(t, err)
	plugin, err := jsplugin.NewRegistry().RegisterFactory(source, jsplugin.Options{Key: "doubao"})
	require.NoError(t, err)

	schema, examples := plugin.Meta.UsageForModel("seedance-2.5-upscale")
	require.Contains(t, schema, "seconds")
	require.Contains(t, schema, "tokens")
	require.Contains(t, schema, "resolution")
	assert.NotContains(t, schema, "video_input")
	assert.Equal(t, []string{"720p", "1080p", "2k"}, schema["resolution"].Enum)
	assert.Equal(t, "Video upscale unit price", schema["seconds"].Description["en"])
	assert.Equal(t, "视频超分单价", schema["seconds"].Description["zh"])
	require.NotEmpty(t, examples)

	genSchema, _ := plugin.Meta.UsageForModel("seedance2.5")
	assert.NotContains(t, genSchema, "seconds")
	assert.Contains(t, genSchema, "video_input")

	t.Run("submit facts include seconds", func(t *testing.T) {
		value, callErr := plugin.Engine.Call(t.Context(), "extractUsage", map[string]any{
			"model":         "seedance-2.5-upscale",
			"upstreamModel": "seedance-2.5-upscale",
			"requestBody": map[string]any{
				"seconds":  5,
				"metadata": map[string]any{"resolution": "720p"},
			},
		})
		require.NoError(t, callErr)
		encoded, marshalErr := common.Marshal(value)
		require.NoError(t, marshalErr)
		var facts map[string]any
		require.NoError(t, common.Unmarshal(encoded, &facts))
		assert.Equal(t, float64(5), facts["seconds"])
		assert.Equal(t, "720p", facts["resolution"])
		assert.NotContains(t, facts, "video_input")
		assert.Contains(t, facts, "tokens")
	})

	t.Run("complete overlays measured duration", func(t *testing.T) {
		value, callErr := plugin.Engine.Call(t.Context(), "extractUsageOnComplete", map[string]any{
			"upstreamModel": "seedance-2.5-upscale",
		}, map[string]any{}, map[string]any{
			"status":     "succeeded",
			"duration":   6,
			"resolution": "2k",
			"usage":      map[string]any{"completion_tokens": 102880},
		})
		require.NoError(t, callErr)
		encoded, marshalErr := common.Marshal(value)
		require.NoError(t, marshalErr)
		var facts map[string]any
		require.NoError(t, common.Unmarshal(encoded, &facts))
		assert.Equal(t, map[string]any{
			"tokens":     float64(102880),
			"resolution": "2k",
			"seconds":    float64(6),
		}, facts)
	})
}
