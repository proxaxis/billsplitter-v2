<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { registerDialogBridge } from '@/utils/dialog';

const queue = [];
const activeRequest = ref(null);
const promptValue = ref('');
const okButton = ref(null);
const promptInput = ref(null);

const isOpen = computed(() => activeRequest.value !== null);
const dialogTitle = computed(() => activeRequest.value?.title || defaultTitle(activeRequest.value?.kind));
const messageLines = computed(() => {
	const raw = String(activeRequest.value?.message ?? '');
	const normalized = raw.replace(/\\n/g, '\n');
	return normalized.split('\n');
});

function defaultTitle(kind) {
	if (kind === 'confirm') return '確認';
	if (kind === 'prompt') return '入力';
	return 'お知らせ';
}

function enqueue(kind, message, options = {}) {
	const text = String(message ?? '');
	return new Promise((resolve) => {
		queue.push({ kind, message: text, options, resolve });
		openNext();
	});
}

function openNext() {
	if (activeRequest.value || queue.length === 0) return;

	const request = queue.shift();
	activeRequest.value = request;
	promptValue.value = String(request.options.defaultValue ?? '');

	nextTick(() => {
		if (request.kind === 'prompt' && promptInput.value) {
			promptInput.value.focus();
			promptInput.value.select();
			return;
		}

		if (okButton.value) {
			okButton.value.focus();
		}
	});
}

function closeWith(result) {
	if (!activeRequest.value) return;
	activeRequest.value.resolve(result);
	activeRequest.value = null;
	openNext();
}

function normalizePromptResult(value) {
	return String(value ?? '')
		.replace(/[ \u3000]+/g, '')
		.replace(/\\n/g, '\n');
}

function onConfirm() {
	if (!activeRequest.value) return;
	if (activeRequest.value.kind === 'prompt') {
		closeWith(normalizePromptResult(promptValue.value));
		return;
	}
	if (activeRequest.value.kind === 'confirm') {
		closeWith(true);
		return;
	}
	closeWith(undefined);
}

function onCancel() {
	if (!activeRequest.value) return;
	if (activeRequest.value.kind === 'prompt') {
		closeWith(null);
		return;
	}
	if (activeRequest.value.kind === 'confirm') {
		closeWith(false);
		return;
	}
	closeWith(undefined);
}

function onBackdropClick() {
	if (!activeRequest.value) return;
	onCancel();
}

function onEscKey(event) {
	if (event.key !== 'Escape' || !activeRequest.value) return;
	onCancel();
}

function alert(message, options = {}) {
	return enqueue('alert', message, options);
}

function confirm(message, options = {}) {
	return enqueue('confirm', message, options);
}

function prompt(message, options = {}) {
	return enqueue('prompt', message, options);
}

defineExpose({ alert, confirm, prompt });

let unregisterBridge = null;

onMounted(() => {
	unregisterBridge = registerDialogBridge({ alert, confirm, prompt });
	document.addEventListener('keydown', onEscKey);
});

onBeforeUnmount(() => {
	if (unregisterBridge) unregisterBridge();
	document.removeEventListener('keydown', onEscKey);
});
</script>

<template>
	<teleport to="body">
		<transition name="dialog-fade">
			<section v-if="isOpen" class="app-dialog" @click.self="onBackdropClick">
				<article class="dialog-panel" role="dialog" aria-modal="true" :aria-label="dialogTitle">
					<header class="dialog-header">
						<h2>{{ dialogTitle }}</h2>
					</header>

					<div class="dialog-message">
						<p v-for="(line, index) in messageLines" :key="`${index}-${line}`">{{ line }}</p>
					</div>

					<div v-if="activeRequest?.kind === 'prompt'" class="dialog-input-wrap">
						<input
							ref="promptInput"
							v-model="promptValue"
							type="text"
							:placeholder="activeRequest?.options?.placeholder || ''"
							@keydown.enter.prevent="onConfirm"
						/>
					</div>

					<footer class="dialog-actions">
						<button
							v-if="activeRequest?.kind !== 'alert'"
							type="button"
							class="btn-cancel"
							@click="onCancel"
						>
							{{ activeRequest?.options?.cancelText || 'キャンセル' }}
						</button>
						<button ref="okButton" type="button" class="btn-ok" @click="onConfirm">
							{{ activeRequest?.options?.okText || 'OK' }}
						</button>
					</footer>
				</article>
			</section>
		</transition>
	</teleport>
</template>

<style lang="scss" scoped>
.app-dialog {
	position: fixed;
	inset: 0;
	z-index: 2100;
	display: grid;
	place-items: center;
	background: rgba(0, 0, 0, 0.35);
	padding: calc(0.75rem + env(safe-area-inset-top)) 0.75rem calc(0.75rem + env(safe-area-inset-bottom));
	overflow-y: auto;
}

.dialog-panel {
	width: min(28rem, calc(100vw - 2rem));
	max-height: calc(100dvh - 1.5rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
	border: 1px solid var(--border);
	border-radius: calc(var(--border-radius) + 2px);
	background: var(--bg-1);
	box-shadow: 0 20px 40px var(--shadow);
	padding: 1rem;
	overflow: auto;
}

.dialog-header h2 {
	margin: 0;
	font-size: 1rem;
}

.dialog-message {
	margin: 0.8rem 0 0;
	color: var(--text-0);

	p {
		margin: 0;
		word-break: break-word;

		& + p {
			margin-top: 0.35rem;
		}
	}
}

.dialog-input-wrap {
	margin-top: 0.9rem;

	input {
		width: 100%;
		box-sizing: border-box;
	}
}

.dialog-actions {
	margin-top: 1rem;
	display: flex;
	justify-content: flex-end;
	gap: 0.6rem;

	button {
		min-width: 4.8rem;
		padding: 0.45rem 0.8rem;
		border-radius: var(--border-radius);
		border: 1px solid var(--border);
		cursor: pointer;
	}

	.btn-cancel {
		background: var(--bg-0);
		color: var(--text-0);
	}

	.btn-ok {
		background: var(--primary);
		border-color: var(--primary);
		color: #fff;
	}
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.15s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}

@media (max-width: 480px) {
	.app-dialog {
		place-items: center;
	}

	.dialog-panel {
		width: calc(100vw - 0.9rem * 2 - 0.75rem * 2);
		max-height: calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
		padding: 0.9rem;
	}

	.dialog-actions {
		position: sticky;
		bottom: 0;
		padding-top: 0.55rem;
		background: linear-gradient(to top, var(--bg-1) 65%, transparent);
	}
}
</style>
