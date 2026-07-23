import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

const API_URL = (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined) ?? 'http://localhost:4000/api/v1'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export default function BrainScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm your Business Brain. Ask me anything about your business — revenue, customers, deals, or anything else. I have live access to your business data.",
      createdAt: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const listRef = useRef<FlatList>(null)

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, createdAt: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const assistantMsgId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date() }])

    try {
      const token = await SecureStore.getItemAsync('kanavu_access_token')
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ message: text, conversationId, stream: true }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let newConversationId: string | undefined

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6)) as { type: string; content?: string; conversationId?: string }
            if (parsed.type === 'text' && parsed.content) {
              fullContent += parsed.content
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m))
            }
            if (parsed.conversationId) newConversationId = parsed.conversationId
            if (parsed.type === 'done') break
          } catch {}
        }
      }

      if (newConversationId) setConversationId(newConversationId)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, content: "Sorry, I couldn't connect to the server. Please check your connection." }
          : m,
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, conversationId])

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
      {item.role === 'assistant' && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🧠</Text>
        </View>
      )}
      <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        {item.content === '' && item.role === 'assistant' ? (
          <ActivityIndicator size="small" color="#94a3b8" />
        ) : (
          <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        )}
      </View>
    </View>
  )

  const SUGGESTED = ['How is my business doing?', 'Any overdue invoices?', "What's my pipeline value?", "Today's appointments"]

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          messages.length <= 1 ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              <View style={styles.suggestionChips}>
                {SUGGESTED.map(s => (
                  <TouchableOpacity key={s} style={styles.chip} onPress={() => setInput(s)}>
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your Business Brain..."
          placeholderTextColor="#475569"
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
          <Text style={styles.sendBtnText}>{loading ? '...' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  messageList: { padding: 16, paddingBottom: 8, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  userRow: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  assistantRow: { alignSelf: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16 },
  bubble: { borderRadius: 16, padding: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  assistantText: { color: '#e2e8f0' },
  suggestions: { marginTop: 24, paddingHorizontal: 4 },
  suggestionsTitle: { fontSize: 12, color: '#64748b', marginBottom: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipText: { color: '#94a3b8', fontSize: 12 },
  inputArea: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#0f172a' },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  sendBtnDisabled: { backgroundColor: '#334155' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
