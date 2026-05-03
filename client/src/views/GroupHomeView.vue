<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGroupStore } from '@/stores/group';
import { useUserStore } from '@/stores/user';
import { usePaymentStore } from '@/stores/payment';
import { copy, share } from '@/utils/navigator';
import { toSafeString } from '@/utils/fetch';
import CurrencyRibbon from '@/components/CurrencyRibbon.vue';
import IconPenToSquare from '@/components/icons/IconPenToSquare.vue';
import IconPlus from '@/components/icons/IconPlus.vue';
import IconCoins from '@/components/icons/IconCoins.vue';
import IconTrash from '@/components/icons/IconTrash.vue';
import IconCopy from '@/components/icons/IconCopy.vue';
import AppHeader from '@/components/AppHeader.vue';
import FloatingButtons from '@/components/FloatingButtons.vue';
import IconGear from '@/components/icons/IconGear.vue';
import toast from '@/utils/toast';
import MemberChip from '@/components/MemberChip.vue';
import IconUserGroup from '@/components/icons/IconUserGroup.vue';
import IconShareFromSquare from '@/components/icons/IconShareFromSquare.vue';

const route = useRoute();
const router = useRouter();
const groupStore = useGroupStore();
const userStore = useUserStore();
const paymentStore = usePaymentStore();
const expandedPayees = ref(new Set());
const expandedPayments = ref(new Set());

const PAYEE_PREVIEW_COUNT = 2;

const grpId = computed(() => toSafeString(route.params.grpId));

const getPayeesFullLabel = (payees) =>
  payees
    .map(groupStore.getMemberById)
    .map((m) => m.banner)
    .join('、');

const getPayeesCompactLabel = (payees) => {
  if (payees.length === 0) return '該当者なし';
  if (payees.length === groupStore.g.members.length) return '全員が該当';

  const visible = payees
    .slice(0, PAYEE_PREVIEW_COUNT)
    .map(groupStore.getMemberById)
    .map((m) => m.banner);
  const hiddenCount = payees.length - PAYEE_PREVIEW_COUNT;

  return hiddenCount > 0 ? `${visible.join('、')} 他 ${hiddenCount} 名` : visible.join('、');
};

const isPayeesExpanded = (pmId) => expandedPayees.value.has(pmId);

const togglePayeesExpanded = (pmId) => {
  const next = new Set(expandedPayees.value);
  if (next.has(pmId)) {
    next.delete(pmId);
  } else {
    next.add(pmId);
  }
  expandedPayees.value = next;
};

const isPaymentExpanded = (paymentId) => expandedPayments.value.has(paymentId);

const togglePaymentExpanded = (paymentId) => {
  const next = new Set(expandedPayments.value);
  if (next.has(paymentId)) {
    next.delete(paymentId);
  } else {
    next.add(paymentId);
  }
  expandedPayments.value = next;
};

const expandAllPayments = () => {
  expandedPayments.value = new Set(paymentStore.p.map((payment) => payment.id));
};

const collapseAllPayments = () => {
  expandedPayments.value = new Set();
};

const copyGroupId = async () => {
  try {
    await copy(groupStore.id);
    toast.message('グループIDをコピーしました');
  } catch (error) {
    toast.error('グループIDのコピーに失敗しました');
  }
};

const memberSummaries = computed(() =>
  Array.from(paymentStore.balance.entries()).map(([id, data]) => ({
    id,
    ...groupStore.getMemberById(id),
    paid: data.paid ?? data.consumption + data.balance,
    consumption: data.consumption,
  })),
);

async function shareURL() {
  const url = window.location.href;
  try {
    await share('立替精算アプリで立替をすぐに終わらせましょう!', url);
    toast.message('URLを共有しました');
  } catch (error) {
    toast.alert('URLの共有に失敗しました');
  }
}

async function copyTransaction() {
  if (paymentStore.transactions.length === 0) {
    toast.alert('コピーする立替がありません');
    return;
  }

  const transactionText = paymentStore.transactions
    .map((t) => {
      const sender = groupStore.getMemberById(t.sender)?.name || '不明';
      const receiver = groupStore.getMemberById(t.receiver)?.name || '不明';
      const amount = t.amount;
      return `${sender} → ${receiver}: ${amount} ${groupStore.g.currency.code}`;
    })
    .join('\n');

  try {
    await copy(transactionText);
    toast.message('立替の内容をコピーしました');
  } catch (error) {
    toast.alert('立替の内容のコピーに失敗しました');
  }
}

onMounted(async () => {
  await groupStore.init(grpId.value);
});
</script>

<template>
  <div class="views group-home-view">
    <AppHeader>
      <li>
        <button title="サブグループの編集" @click="router.push({ name: 'EditSubGroup', params: { grpId: groupStore.id } })">
          <IconUserGroup />
        </button>
      </li>
      <li>
        <button title="設定" @click="router.push({ name: 'EditGroup', params: { grpId: groupStore.id } })">
          <IconGear />
        </button>
      </li>
    </AppHeader>

    <main class="app-content">
      <header class="hero">
        <h1>{{ groupStore.g.icon + groupStore.g.name }}</h1>
        <p>{{ groupStore.g.description }}</p>
      </header>

      <details open>
        <summary>概要</summary>
        <ul class="kv-list content">
          <li>
            <span>グループID</span>
            <button type="button" class="copy-value-button" title="クリックしてコピー" @click="copyGroupId">
              <code>{{ groupStore.id }}</code>
              <IconCopy size="1rem" />
            </button>
          </li>
          <li>
            <span>開始予定日</span><span>{{ groupStore.g.timeDisplay.start ?? 'なし' }}</span>
          </li>
          <li>
            <span>終了予定日</span><span>{{ groupStore.g.timeDisplay.end ?? 'なし' }}</span>
          </li>
          <li>
            <span>作成日時</span><span>{{ groupStore.g.timeDisplay.created }}</span>
          </li>
          <li>
            <span>更新日時</span><span>{{ groupStore.g.timeDisplay.updated }}</span>
          </li>
          <li>
            <span>表示通貨</span>
            <span> {{ groupStore.g.currencyDisplay.code }} ({{ groupStore.g.currencyDisplay.name }}/{{ groupStore.g.currencyDisplay.symbol }}) </span>
          </li>
          <li>
            <span>タイムゾーン</span>
            <span>{{ groupStore.g.timeDisplay.offset }} ({{ groupStore.g.timezone }})</span>
          </li>
          <li>
            <span>メンバー数</span><span>{{ groupStore.g.members.length }}</span>
          </li>
        </ul>
      </details>

      <div class="content-grid">
        <div class="content-column">
          <section class="panel">
            <h2>メンバー</h2>
            <ul class="members-list">
              <MemberChip v-for="m in groupStore.g.members" :key="m.id" :banner="m.banner" />
            </ul>
          </section>

          <section class="panel">
            <h2>メンバー別集計</h2>
            <ul class="summary-list">
              <li v-for="member in memberSummaries" :key="member.id" class="summary-item">
                <details>
                  <summary>{{ member.icon + member.name }}</summary>
                  <ul class="kv-list content">
                    <li>
                      <span>支払った金額</span><span><CurrencyRibbon :value="member.paid" /></span>
                    </li>
                    <li>
                      <span>消費した金額</span>
                      <span><CurrencyRibbon :value="member.consumption" /></span>
                    </li>
                  </ul>
                </details>
              </li>
            </ul>
          </section>

          <section class="panel">
            <h2 class="transaction-header">
              <span>現在の立替</span>
              <button @click="copyTransaction">
                <IconCopy size="1rem" />
              </button>
            </h2>
            <ul v-if="paymentStore.transactions.length > 0" class="kv-list">
              <li v-for="transaction in paymentStore.transactions" :key="transaction.sender + transaction.receiver" class="transaction-item">
                <span>
                  {{ groupStore.getMemberById(transaction.sender)?.banner }}
                  → {{ groupStore.getMemberById(transaction.receiver)?.banner }}
                </span>
                <code><CurrencyRibbon :value="transaction.amount" /></code>
              </li>
            </ul>
            <div v-else class="empty">
              <p>現在の立替はありません</p>
            </div>
          </section>
        </div>

        <div class="content-column">
          <section class="panel">
            <div class="panel-header">
              <h2>支払履歴</h2>
              <div class="history-controls">
                <button type="button" @click="expandAllPayments">全て開く</button>
                <button type="button" @click="collapseAllPayments">全て閉じる</button>
              </div>
            </div>
            <ul v-if="paymentStore.p.length > 0" class="payments-list">
              <li v-for="p in paymentStore.p" :key="p.id">
                <details :open="isPaymentExpanded(p.id)">
                  <summary class="payment-summary" :class="{ highlight: p.type === 'repayment' }" @click.prevent="togglePaymentExpanded(p.id)">
                    <span>{{ p.name }}</span>
                    <code><CurrencyRibbon :value="p.amount" /></code>
                  </summary>
                  <ul class="kv-list content">
                    <li class="note-row">
                      <span class="note-label">メモ</span>
                      <span class="note-value">{{ p.description || '-' }}</span>
                    </li>
                    <li>
                      <span>支払者</span>
                      <span>
                        {{ groupStore.getMemberById(p.payer).banner }}
                      </span>
                    </li>
                    <li class="payees-row note-row">
                      <span class="note-label">受取者</span>
                      <button
                        type="button"
                        class="payees-toggle"
                        :class="{ expanded: isPayeesExpanded(p.id) }"
                        :title="isPayeesExpanded(p.id) ? 'クリックで折りたたむ' : getPayeesFullLabel(p.payees)"
                        @click="togglePayeesExpanded(p.id)"
                      >
                        {{ isPayeesExpanded(p.id) ? getPayeesFullLabel(p.payees) : getPayeesCompactLabel(p.payees) }}
                      </button>
                    </li>
                    <li v-if="p.currency">
                      <span>入力通貨</span>
                      <span>{{ p.currency.code }}</span>
                    </li>
                    <li v-if="p.exchangeRate">
                      <span>為替レート</span>
                      <span>1 {{ p.currency.code }} = {{ p.exchangeRate }} {{ groupStore.g.currency.code }}</span>
                    </li>
                    <li>
                      <span>支払日時</span>
                      <span>{{ p.timeDisplay.paid }}</span>
                    </li>
                    <li>
                      <span>登録日時</span>
                      <span>{{ p.timeDisplay.created }}</span>
                    </li>
                  </ul>

                  <div class="payment-actions">
                    <button @click="paymentStore.deletePayment(p.id)">
                      <IconTrash size="1.25rem" />
                    </button>
                    <button
                      @click="
                        p.type === 'repayment'
                          ? router.push({ name: 'EditRepayment', params: { grpId: groupStore.id, payId: p.id } })
                          : router.push({ name: 'EditPayment', params: { grpId: groupStore.id, payId: p.id } })
                      "
                    >
                      <IconPenToSquare size="1.25rem" />
                    </button>
                  </div>
                </details>
              </li>
            </ul>
            <div v-else class="empty">
              <p>現在の履歴はありません</p>
            </div>
          </section>
        </div>
      </div>

      <FloatingButtons>
        <button title="URLを共有" @click="shareURL">
          <IconShareFromSquare size="1.5rem" />
        </button>

        <button title="返済を追加" @click="router.push({ name: 'NewRepayment', params: { grpId: groupStore.id } })">
          <IconCoins size="1.5rem" />
        </button>

        <button class="floating-main-button" title="支払いを追加" @click="router.push({ name: 'NewPayment', params: { grpId: groupStore.id } })">
          <IconPlus size="1.5rem" />
        </button>
      </FloatingButtons>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.app-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-0);
  padding: 1rem;

  h2 {
    margin: 0 0 0.8rem;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.8rem;

  h2 {
    margin: 0;
  }
}

.history-controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;

  button {
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    background-color: var(--bg-1);
    color: var(--text-0);
    cursor: pointer;
    padding: 0.25rem 0.55rem;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
}

.kv-list {
  list-style: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  li {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.7rem;
    padding-bottom: 0.45rem;
    border-bottom: 1px dashed var(--border);
  }

  li:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  li > span:last-child {
    text-align: right;
    word-break: break-word;
  }
}

.content-grid {
  display: flex;
  gap: 1rem;
  align-items: flex-start;

  @include var.narrow() {
    flex-direction: column;
  }
}

.content-column {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @include var.narrow() {
    width: 100%;
  }
}

.members-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.payment-summary {
  display: flex;
  justify-content: space-between;
}

.payment-actions {
  display: flex;
  justify-content: space-between;

  button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 1rem;

    &:hover {
      transform: scale(1.1);
    }
  }
}

code {
  font-family: 'DM Mono', monospace;
}

.copy-value-button {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: flex-end;
  text-align: right;
  min-width: 0;
  flex: 1 1 0;

  &:hover {
    color: var(--accent);
  }

  code {
    cursor: pointer;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.payees-toggle {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: pointer;
  display: inline-block;
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;

  &:hover {
    color: var(--primary);
  }
}

.payees-toggle.expanded {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  text-align: left;
  justify-self: stretch;
}

.payees-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.note-row {
  align-items: flex-start;
}

.note-label {
  flex: 0 0 4.5rem;
}

.note-value {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  button {
    border: none;
    border-radius: var(--border-radius);
    width: 16rem;
    height: 2rem;
    cursor: pointer;
    color: var(--text-1);

    &:hover {
      transform: translateY(-2px);
      filter: brightness(1.05);
    }

    &:last-child {
      background-color: var(--primary);
    }

    @include var.narrow() {
      width: 100%;
    }
  }
}

.transaction-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;

  button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icons {
    &:hover {
      transform: scale(1.1);
    }
  }
}

.highlight {
  * {
    color: var(--danger);
  }
}
</style>
