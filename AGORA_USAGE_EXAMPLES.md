# Agora Video Call Integration - Usage Examples

Complete examples for implementing video calls in your mobile or web applications.

## Backend Setup (Already Done)

The backend endpoint is ready at:
```
POST /api/v1/video-calls/token
```

Environment variables are configured in `.env.local`:
```env
AGORA_APP_ID=0b0a3b554bbb4204864c5336a55194f5
AGORA_APP_CERTIFICATE=904e13ad2d824463afc96fee16a3ab96
```

## JavaScript/React Web Client

### Basic Token Request

```javascript
async function getVideoCallToken(branchId, doctorId, patientId, accessToken) {
  try {
    const response = await fetch('/api/v1/video-calls/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branchId,
        doctorId,
        patientId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get token');
    }

    const { data } = await response.json();
    return data; // { token, channelName, uid, expiresIn, expiresAt }
  } catch (error) {
    console.error('Error getting video call token:', error);
    throw error;
  }
}
```

### Typescript Version

```typescript
interface GetTokenParams {
  branchId: string;
  doctorId: string;
  patientId: string;
  accessToken: string;
}

interface AgoraTokenData {
  token: string;
  channelName: string;
  uid: number;
  expiresIn: number;
  expiresAt: number;
}

async function getVideoCallToken({
  branchId,
  doctorId,
  patientId,
  accessToken
}: GetTokenParams): Promise<AgoraTokenData> {
  const response = await fetch('/api/v1/video-calls/token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      branchId,
      doctorId,
      patientId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get token');
  }

  const { data } = await response.json();
  return data;
}
```

## iOS (Swift) Integration

### Using URLSession

```swift
import Foundation

struct AgoraTokenResponse: Codable {
    struct Data: Codable {
        let token: String
        let channelName: String
        let uid: UInt32
        let expiresIn: Int
        let expiresAt: Double
    }
    
    let message: String
    let data: Data
}

class VideoCallService {
    let baseURL = "https://your-api.com"
    
    func getVideoCallToken(
        branchId: String,
        doctorId: String,
        patientId: String,
        accessToken: String,
        completion: @escaping (Result<AgoraTokenResponse.Data, Error>) -> Void
    ) {
        let endpoint = "\(baseURL)/api/v1/video-calls/token"
        guard let url = URL(string: endpoint) else {
            completion(.failure(URLError(.badURL)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "branchId": branchId,
            "doctorId": doctorId,
            "patientId": patientId
        ]
        
        request.httpBody = try? JSONEncoder().encode(body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(URLError(.unknown)))
                return
            }
            
            do {
                let response = try JSONDecoder().decode(AgoraTokenResponse.self, from: data)
                completion(.success(response.data))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

// Usage
let service = VideoCallService()
service.getVideoCallToken(
    branchId: "550e8400-e29b-41d4-a716-446655440000",
    doctorId: "6ba7b810-950c-7e8c-e41d-4f0000000001",
    patientId: "6ba7b810-950c-7e8c-e41d-4f0000000002",
    accessToken: userAccessToken
) { result in
    switch result {
    case .success(let tokenData):
        print("Got token: \(tokenData.token)")
        // Initialize Agora with tokenData
    case .failure(let error):
        print("Error: \(error)")
    }
}
```

### Using Combine (Modern Approach)

```swift
import Combine

class VideoCallViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var error: String?
    @Published var tokenData: AgoraTokenResponse.Data?
    
    private var cancellables = Set<AnyCancellable>()
    
    func requestVideoCallToken(
        branchId: String,
        doctorId: String,
        patientId: String,
        accessToken: String
    ) {
        isLoading = true
        
        guard let url = URL(string: "https://your-api.com/api/v1/video-calls/token") else {
            error = "Invalid URL"
            isLoading = false
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "branchId": branchId,
            "doctorId": doctorId,
            "patientId": patientId
        ]
        
        request.httpBody = try? JSONEncoder().encode(body)
        
        URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: AgoraTokenResponse.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                }
            } receiveValue: { [weak self] response in
                self?.tokenData = response.data
            }
            .store(in: &cancellables)
    }
}
```

## Android (Kotlin) Integration

### Using OkHttp

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson

data class AgoraTokenData(
    val token: String,
    val channelName: String,
    val uid: Int,
    val expiresIn: Int,
    val expiresAt: Long
)

data class AgoraTokenResponse(
    val message: String,
    val data: AgoraTokenData
)

class VideoCallService {
    private val client = OkHttpClient()
    private val gson = Gson()
    private val baseURL = "https://your-api.com"
    
    fun getVideoCallToken(
        branchId: String,
        doctorId: String,
        patientId: String,
        accessToken: String,
        callback: (Result<AgoraTokenData>) -> Unit
    ) {
        val endpoint = "$baseURL/api/v1/video-calls/token"
        
        val requestBody = mapOf(
            "branchId" to branchId,
            "doctorId" to doctorId,
            "patientId" to patientId
        )
        
        val jsonBody = gson.toJson(requestBody)
        
        val request = Request.Builder()
            .url(endpoint)
            .post(jsonBody.toRequestBody("application/json".toMediaType()))
            .addHeader("Authorization", "Bearer $accessToken")
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(Result.failure(e))
            }
            
            override fun onResponse(call: Call, response: Response) {
                try {
                    val body = response.body?.string() ?: ""
                    val tokenResponse = gson.fromJson(body, AgoraTokenResponse::class.java)
                    callback(Result.success(tokenResponse.data))
                } catch (e: Exception) {
                    callback(Result.failure(e))
                }
            }
        })
    }
}

// Usage
val service = VideoCallService()
service.getVideoCallToken(
    branchId = "550e8400-e29b-41d4-a716-446655440000",
    doctorId = "6ba7b810-950c-7e8c-e41d-4f0000000001",
    patientId = "6ba7b810-950c-7e8c-e41d-4f0000000002",
    accessToken = userAccessToken
) { result ->
    result.onSuccess { tokenData ->
        println("Got token: ${tokenData.token}")
        // Initialize Agora with tokenData
    }
    result.onFailure { error ->
        println("Error: ${error.message}")
    }
}
```

### Using Retrofit + Coroutines

```kotlin
import retrofit2.http.POST
import retrofit2.http.Body
import retrofit2.http.Header
import kotlinx.coroutines.launch
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope

interface AgoraApi {
    @POST("/api/v1/video-calls/token")
    suspend fun getVideoCallToken(
        @Header("Authorization") token: String,
        @Body request: TokenRequest
    ): TokenResponse
}

data class TokenRequest(
    val branchId: String,
    val doctorId: String,
    val patientId: String
)

data class TokenResponse(
    val message: String,
    val data: AgoraTokenData
)

class VideoCallViewModel(private val api: AgoraApi) : ViewModel() {
    fun requestVideoCallToken(
        branchId: String,
        doctorId: String,
        patientId: String,
        accessToken: String
    ) {
        viewModelScope.launch {
            try {
                val response = api.getVideoCallToken(
                    "Bearer $accessToken",
                    TokenRequest(branchId, doctorId, patientId)
                )
                // Handle response
                println("Got token: ${response.data.token}")
            } catch (e: Exception) {
                // Handle error
                println("Error: ${e.message}")
            }
        }
    }
}
```

## Flutter Integration

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class VideoCallService {
  final String baseUrl = 'https://your-api.com';
  
  Future<AgoraTokenData> getVideoCallToken({
    required String branchId,
    required String doctorId,
    required String patientId,
    required String accessToken,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/video-calls/token'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'branchId': branchId,
        'doctorId': doctorId,
        'patientId': patientId,
      }),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return AgoraTokenData.fromJson(data['data']);
    } else {
      throw Exception('Failed to get video call token');
    }
  }
}

class AgoraTokenData {
  final String token;
  final String channelName;
  final int uid;
  final int expiresIn;
  final int expiresAt;
  
  AgoraTokenData({
    required this.token,
    required this.channelName,
    required this.uid,
    required this.expiresIn,
    required this.expiresAt,
  });
  
  factory AgoraTokenData.fromJson(Map<String, dynamic> json) {
    return AgoraTokenData(
      token: json['token'],
      channelName: json['channelName'],
      uid: json['uid'],
      expiresIn: json['expiresIn'],
      expiresAt: json['expiresAt'],
    );
  }
}

// Usage
final service = VideoCallService();
final tokenData = await service.getVideoCallToken(
  branchId: '550e8400-e29b-41d4-a716-446655440000',
  doctorId: '6ba7b810-950c-7e8c-e41d-4f0000000001',
  patientId: '6ba7b810-950c-7e8c-e41d-4f0000000002',
  accessToken: userAccessToken,
);

// Initialize Agora with tokenData
```

## Error Handling Patterns

### Retry Logic

```typescript
async function getTokenWithRetry(
  branchId: string,
  doctorId: string,
  patientId: string,
  accessToken: string,
  maxRetries: number = 3
): Promise<AgoraTokenData> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getVideoCallToken(branchId, doctorId, patientId, accessToken);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 401 or 403 (auth issues)
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }
  
  throw lastError || new Error('Failed to get token after retries');
}
```

### Error Messages

```typescript
function getErrorMessage(error: any): string {
  if (error.status === 401) {
    return 'Authentication failed. Please log in again.';
  } else if (error.status === 403) {
    return 'You are not authorized to make this video call.';
  } else if (error.status === 404) {
    return 'One or more participants not found.';
  } else if (error.status === 409) {
    return 'Participants are not in the same facility.';
  } else {
    return 'Failed to initiate video call. Please try again.';
  }
}
```

## Token Refresh Strategy

Tokens expire after 24 hours. For long calls:

```typescript
async function startVideoCallWithRefresh(
  branchId: string,
  doctorId: string,
  patientId: string,
  accessToken: string
) {
  let tokenData = await getVideoCallToken(branchId, doctorId, patientId, accessToken);
  
  // Schedule token refresh 30 minutes before expiration
  const refreshTime = (tokenData.expiresIn - 1800) * 1000; // milliseconds
  
  const refreshTimer = setTimeout(async () => {
    try {
      const newToken = await getVideoCallToken(branchId, doctorId, patientId, accessToken);
      // Renew token in Agora
      agoraEngine.renewToken(newToken.token);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }, refreshTime);
  
  // Clean up on call end
  return () => clearTimeout(refreshTimer);
}
```

## Next Steps

1. Integrate the appropriate code for your platform
2. Test with real doctor and patient accounts
3. Handle network errors gracefully
4. Add loading states and error displays to UI
5. Monitor token generation success rate
6. Implement call analytics logging
