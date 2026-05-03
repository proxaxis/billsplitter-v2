<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import IconPlus from '@/components/icons/IconPlus.vue';
import IconUserGroup from '@/components/icons/IconUserGroup.vue';
import IconHouse from '@/components/icons/IconHouse.vue';
import toast from '@/utils/toast';

const router = useRouter();
const vmGroupId = ref('');

const trimmedGroupId = computed(() => vmGroupId.value.trim());

function moveToNewGroup() {
	router.push({ name: 'NewGroup' });
}

function moveToGroupHome() {
	if (trimmedGroupId.value.length < 4) {
		toast.alert('グループIDを入力してください');
		return;
	}

	router.push({
		name: 'GroupHome',
		params: { grpId: trimmedGroupId.value },
	});
}
</script>

<template>
	<div class="views index-page-view">
		<AppHeader>
			<li>
				<button class="header-action" title="新しいグループを作成" @click="moveToNewGroup">
					<IconPlus size="1.05rem" />
					<span>新規作成</span>
				</button>
			</li>
		</AppHeader>

		<main class="app-content">
			<section class="entry-hero">
				<p class="eyebrow">CLEAR, FAIR, FAST</p>
				<h1>立替の「あとで計算」を、<br />今この場で終わらせる。</h1>
				<p class="lead">
					旅行、飲み会、共同購入、同居費。誰がいくら払って、誰がどれだけ負担したかを、
					記録から精算までひとつの画面で見える化します。
					もう「メモが散らばって計算が合わない」を繰り返しません。
				</p>

				<div class="hero-actions">
					<button class="btn btn-primary" @click="moveToNewGroup">
						<IconPlus size="1.1rem" />
						<span>3分で新しいグループを作る</span>
					</button>
					<a href="#quick-join" class="btn btn-secondary">
						<IconUserGroup size="1.1rem" />
						<span>既存グループに参加する</span>
					</a>
				</div>

				<ul class="hero-points">
					<li>複数メンバーの立替と返済を一元管理</li>
					<li>通貨・為替・タイムゾーンの差異にも対応</li>
					<li>精算額を自動算出し、返済ルートを明確化</li>
				</ul>
			</section>

			<section id="quick-join" class="join-section">
				<header>
					<h2>グループIDで今すぐ参加</h2>
					<p>メンバーから共有されたグループIDを入力すると、すぐに精算画面へ移動できます。</p>
				</header>

				<div class="join-form">
					<label for="group-id">グループID</label>
					<input
						id="group-id"
						v-model="vmGroupId"
						type="text"
						placeholder="グループIDを入力: 550e8400e29b41d4a71644665544..."
						@keydown.enter.prevent="moveToGroupHome"
					/>
					<button class="btn btn-accent" @click="moveToGroupHome">
						<IconHouse size="1.1rem" />
						<span>グループへ移動</span>
					</button>
				</div>
			</section>

			<section class="feature-section">
				<h2>このアプリでできること</h2>
				<div class="feature-grid">
					<article class="feature-card">
						<h3>1. 支払い記録を素早く登録</h3>
						<p>
							支払者、対象メンバー、金額、メモ、日時を入力するだけ。
							計算式入力にも対応しているので、レシートを見ながらそのまま記録できます。
						</p>
					</article>
					<article class="feature-card">
						<h3>2. 負担を公平に再配分</h3>
						<p>
							誰が多く払い、誰が不足しているかを自動集計。
							返済すべき方向と金額を一覧化し、精算の会話を短く明確にします。
						</p>
					</article>
					<article class="feature-card">
						<h3>3. グループ運用を柔軟に管理</h3>
						<p>
							メンバー追加・サブグループ設定・通貨変更・タイムゾーン調整をサポート。
							イベント単位でも長期プロジェクトでも使い続けられます。
						</p>
					</article>
				</div>
			</section>

			<section class="steps-section">
				<h2>使い方は4ステップ</h2>
				<ol class="steps-list">
					<li>
						<strong>グループを作成</strong>
						<p>グループ名・メンバー・通貨を設定して開始します。</p>
					</li>
					<li>
						<strong>支払いを登録</strong>
						<p>立替が発生したら、その都度記録します。</p>
					</li>
					<li>
						<strong>差額を確認</strong>
						<p>メンバーごとの支払額と消費額の差分を確認します。</p>
					</li>
					<li>
						<strong>返済を実行</strong>
						<p>表示されたルートに沿って返済し、精算完了です。</p>
					</li>
				</ol>
			</section>

			<section class="closing-cta">
				<h2>まずは1グループ、今日から。</h2>
				<p>立替管理を「記憶」ではなく「記録」に変えて、会計のストレスを減らしましょう。</p>
				<button class="btn btn-primary" @click="moveToNewGroup">
					<IconPlus size="1.1rem" />
					<span>無料で始める</span>
				</button>
			</section>
		</main>
	</div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.index-page-view {
	--entry-grad-1: #f6e7d8;
	--entry-grad-2: #d4e8ff;
	--entry-grad-3: #d6f6e1;
}

.app-content {
	display: grid;
	gap: 1rem;
	position: relative;
	isolation: isolate;
	padding-bottom: 3rem;
}

.app-content::before,
.app-content::after {
	content: '';
	position: absolute;
	z-index: -1;
	border-radius: 999px;
	filter: blur(34px);
	opacity: 0.46;
}

.app-content::before {
	width: 24rem;
	height: 24rem;
	top: 0.25rem;
	right: 0;
	background: radial-gradient(circle at 30% 30%, var(--entry-grad-1), transparent 70%);
}

.app-content::after {
	width: 20rem;
	height: 20rem;
	left: -4rem;
	bottom: 2rem;
	background: radial-gradient(circle at 60% 30%, var(--entry-grad-2), transparent 70%);
}

.header-action {
	border: 1px solid var(--border);
	border-radius: 999px;
	background-color: var(--bg-0);
	color: var(--text-0);
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.45rem 0.85rem;
	font-size: 0.82rem;
}

.entry-hero,
.join-section,
.feature-section,
.steps-section,
.closing-cta {
	border: 1px solid var(--border);
	border-radius: var(--border-radius);
	background-color: var(--bg-0);
	box-shadow: 0 10px 26px color-mix(in srgb, var(--shadow) 24%, transparent);
}

.entry-hero {
	padding: 1.6rem 1.3rem;
	background:
		linear-gradient(120deg, color-mix(in srgb, var(--entry-grad-3) 58%, transparent) 0%, transparent 45%),
		linear-gradient(160deg, color-mix(in srgb, var(--entry-grad-2) 44%, transparent) 0%, transparent 55%),
		var(--bg-0);

	h1 {
		margin: 0.2rem 0 0;
		line-height: 1.36;
		font-family: 'Noto Serif JP', serif;
		letter-spacing: 0.04em;
		font-size: clamp(1.65rem, 3vw, 2.5rem);
		animation: fade-up 0.55s ease-out both;
	}
}

.eyebrow {
	margin: 0;
	color: var(--text-1);
	letter-spacing: 0.18em;
	font-family: 'DM Mono', monospace;
	font-size: 0.73rem;
}

.lead {
	color: var(--text-0);
	margin: 0.9rem 0 0;
	line-height: 1.82;
	max-width: 60ch;
	animation: fade-up 0.62s ease-out both;
}

.hero-actions {
	margin-top: 1rem;
	display: flex;
	flex-wrap: wrap;
	gap: 0.65rem;
}

.hero-points {
	margin: 1rem 0 0;
	display: grid;
	gap: 0.48rem;

	li {
		color: var(--text-0);
		font-size: 0.94rem;
	}
}

.join-section {
	padding: 1.15rem 1rem;

	h2 {
		margin: 0;
	}

	p {
		margin: 0.55rem 0 0;
		color: var(--text-1);
	}
}

.join-form {
	margin-top: 0.9rem;
	display: grid;
	gap: 0.45rem;
	grid-template-columns: 1fr auto;
	align-items: end;

	label {
		grid-column: 1 / -1;
		font-size: 0.86rem;
		color: var(--text-1);
	}

	input {
		height: 2.35rem;
		font-family: 'DM Mono', monospace;
	}
}

.feature-section {
	padding: 1.2rem 1rem;

	h2 {
		margin: 0;
	}
}

.feature-grid {
	margin-top: 0.85rem;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.72rem;
}

.feature-card {
	border: 1px solid var(--border);
	border-radius: 0.7rem;
	background-color: var(--bg-1);
	padding: 0.95rem;
	animation: fade-up 0.6s ease-out both;

	h3 {
		margin: 0;
		font-size: 0.98rem;
		font-family: 'M PLUS 1p', sans-serif;
	}

	p {
		margin: 0.55rem 0 0;
		color: var(--text-0);
		line-height: 1.7;
		font-size: 0.9rem;
	}
}

.steps-section {
	padding: 1.2rem 1rem;
}

.steps-list {
	margin: 0.8rem 0 0;
	display: grid;
	gap: 0.6rem;
	padding-left: 1.2rem;

	li {
		padding: 0.6rem 0.3rem;
		border-bottom: 1px dashed var(--border);
	}

	strong {
		font-family: 'M PLUS Rounded 1c', sans-serif;
	}

	p {
		margin: 0.35rem 0 0;
		color: var(--text-1);
	}
}

.closing-cta {
	padding: 1.35rem 1rem;
	text-align: center;
	background:
		linear-gradient(125deg, color-mix(in srgb, var(--entry-grad-1) 50%, transparent) 0%, transparent 42%),
		linear-gradient(300deg, color-mix(in srgb, var(--entry-grad-2) 44%, transparent) 0%, transparent 45%),
		var(--bg-0);

	h2 {
		margin: 0;
		font-family: 'Noto Serif JP', serif;
	}

	p {
		margin: 0.55rem auto 0;
		color: var(--text-1);
		max-width: 52ch;
	}

	.btn {
		margin-top: 1rem;
	}
}

.btn {
	border: none;
	border-radius: 999px;
	padding: 0.68rem 1.05rem;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	font-family: 'M PLUS 1p', sans-serif;
	font-size: 0.87rem;
	text-decoration: none;
	transition:
		transform 0.2s ease,
		filter 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		filter: brightness(1.05);
		cursor: pointer;
	}
}

.btn-primary {
	background-color: #1e4aff;
	color: #fff;
}

.btn-secondary {
	border: 1px solid var(--border);
	background-color: var(--bg-0);
	color: var(--text-0);
}

.btn-accent {
	background-color: #0d9c6b;
	color: #fff;
	white-space: nowrap;
}

@keyframes fade-up {
	from {
		transform: translateY(8px);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

@include var.narrow {
	.app-content {
		gap: 0.8rem;
	}

	.entry-hero,
	.join-section,
	.feature-section,
	.steps-section,
	.closing-cta {
		padding-left: 0.9rem;
		padding-right: 0.9rem;
	}

	.join-form {
		grid-template-columns: 1fr;
	}

	.feature-grid {
		grid-template-columns: 1fr;
	}

	.hero-actions {
		flex-direction: column;
		align-items: stretch;
	}
}
</style>
