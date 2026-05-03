<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { request, toSafeString } from '@/utils/fetch';
import { useGroupStore } from '@/stores/group';
import { usePaymentStore } from '@/stores/payment';
import AppHeader from '@/components/AppHeader.vue';
import DateTimeSelector from '@/components/DateTimeSelector.vue';
import CurrencySelector from '@/components/CurrencySelector.vue';
import CurrencyRibbon from '@/components/CurrencyRibbon.vue';
import IconGear from '@/components/icons/IconGear.vue';
import { toast } from '@/utils/toast';
import { useUserStore } from '@/stores/user';
import MemberChip from '@/components/MemberChip.vue';

const route = useRoute();
const router = useRouter();
const groupStore = useGroupStore();
const paymentStore = usePaymentStore();
const userStore = useUserStore();

const props = defineProps({
  inNewMode: {
    type: Boolean,
    default: false,
  },
  isRepayment: {
    type: Boolean,
    default: false,
  },
});

const vmName = ref('');
const vmDescription = ref('');
const vmPayer = ref(0);
const vmReceiver = ref(0);
const vmPayeeMembers = ref([]);
const vmPayeeGroups = ref([]);
const vmAmountExpression = ref('');
const vmInputCurrency = ref(groupStore.g.currency);
const vmExchangeRate = ref(1);
const vmPaidAt = ref(new Date().toISOString());

const grpId = computed(() => toSafeString(route.params.grpId));
const payId = computed(() => toSafeString(route.params.payId));

const nowCalculatedAmount = computed(() => {
  const formula = vmAmountExpression.value;
  if (formula.trim() === '') return { isOK: true, amount: 0 };
  try {
    if (/[^0-9+\-*/().\s]/.test(formula)) throw new Error('使用できない文字が含まれています');
    const result = new Function(`return ${formula}`)();
    if (typeof result !== 'number' || !isFinite(result)) throw new Error('有効な計算結果が得られませんでした');
    return { isOK: true, amount: result };
  } catch (error) {
    return { isOK: false, message: error.message };
  }
});

const nowPayees = computed(() => {
  // 個人指定で全員が選ばれている場合は、グループの全メンバー情報を返す
  if (vmPayeeMembers.value.includes(0)) {
    return { isAll: true, members: groupStore.g.members };
  }
  // そうでない場合は、個人指定とサブグループ指定の両方からメンバーIDを集めて重複を除去し、メンバー情報を返す
  else {
    const memberIds = [...vmPayeeMembers.value, ...vmPayeeGroups.value.flatMap((gid) => groupStore.getSubGroupById(gid)?.members)].filter(
      (id, index, array) => array.indexOf(id) === index,
    );
    memberIds.sort((a, b) => a - b);
    return { isAll: false, members: memberIds.map((id) => groupStore.getMemberById(id)) };
  }
});

async function submit() {
  if (vmName.value.trim() === '') {
    if (props.isRepayment) {
      toast.alert('返済名を入力してください');
    } else {
      toast.alert('支払い名を入力してください');
    }
    return;
  }
  if (vmPayer.value === 0) {
    if (props.isRepayment) {
      toast.alert('返済者を選択してください');
    } else {
      toast.alert('支払者を選択してください');
    }
    return;
  }
  if (props.isRepayment && vmReceiver.value === 0) {
    toast.alert('受け取り者を選択してください');
    return;
  }
  if (!props.isRepayment && nowPayees.value.members.length === 0) {
    toast.alert('受取者を選択してください');
    return;
  }
  if (nowCalculatedAmount.value.isOK === false) {
    toast.alert('金額の計算にエラーがあります: ' + nowCalculatedAmount.value.message);
    return;
  }
  if (Number(vmExchangeRate.value) <= 0) {
    toast.alert('為替レートは0より大きい数値を入力してください');
    return;
  }

  const payload = {
    name: vmName.value.trim(),
    description: vmDescription.value.trim(),
    amount: nowCalculatedAmount.value.amount,
    paid_at: vmPaidAt.value,
    currency: vmInputCurrency.value.code,
    exchange_rate: Number(vmExchangeRate.value) || 1,
    type: props.isRepayment ? 'repayment' : 'payment',
    payer: vmPayer.value,
    payees: props.isRepayment ? [vmReceiver.value] : nowPayees.value.members.map((m) => m.id),
  };

  // 新規登録モード
  if (props.inNewMode) {
    userStore.isLoading = true;
    try {
      const res = await request(`/g/${grpId.value}/new`, {
        method: 'POST',
        body: payload,
      });
      paymentStore.addPayment(res);
      router.push({ name: 'GroupHome', params: { grpId: grpId.value } });
    } catch (error) {
      toast.alert('支払いの登録に失敗しました');
    } finally {
      userStore.isLoading = false;
    }
  }
  // 編集モード
  else {
    userStore.isLoading = true;
    try {
      const res = await request(`/g/${grpId.value}/${payId.value}`, {
        method: 'PATCH',
        body: payload,
      });
      console.log('Updated payment:', res);
      paymentStore.updatePayment(res);
      router.push({ name: 'GroupHome', params: { grpId: grpId.value } });
    } catch (error) {
      toast.alert('支払いの更新に失敗しました');
    } finally {
      userStore.isLoading = false;
    }
  }

}

onMounted(async () => {
  await groupStore.init(grpId.value);

  if (!props.inNewMode) {
    const pm = paymentStore.getPaymentById(payId.value);
    vmName.value = pm.name;
    vmDescription.value = pm.description;
    vmPayer.value = pm.payer;
    vmReceiver.value = pm.payees.length > 0 ? pm.payees[0] : 0;
    vmPayeeMembers.value = pm.payees;
    vmPayeeGroups.value = [];
    vmAmountExpression.value = String(pm.amount);
    vmInputCurrency.value = pm.currency;
    vmExchangeRate.value = pm.exchangeRate;
    vmPaidAt.value = pm.paidAt;
  }
});
</script>

<template>
  <div class="views payment-mng-view">
    <AppHeader>
      <li>
        <router-link :to="{ name: 'GroupHome' }"><IconGear size="1.25rem" /><span>設定</span></router-link>
      </li>
    </AppHeader>

    <main class="app-content">
      <header class="hero">
        <h1>
          <span v-if="props.isRepayment && props.inNewMode">返済登録</span>
          <span v-else-if="props.isRepayment">返済編集</span>
          <span v-else-if="props.inNewMode">支払い登録</span>
          <span v-else>支払い編集</span>
        </h1>
        <p>
          <span v-if="props.isRepayment && props.inNewMode">新しい返済記録を追加します</span>
          <span v-else-if="props.isRepayment">返済記録を編集します</span>
          <span v-else-if="props.inNewMode">新しい支払い記録を追加します</span>
          <span v-else>支払い記録を編集します</span>
        </p>
      </header>

      <main>
        <section>
          <label>
            <span v-if="props.isRepayment">返済名</span>
            <span v-else>支払名</span>
            <input v-model="vmName" type="text" :placeholder="props.isRepayment ? '返済名...' : '支払名...'" />
          </label>

          <label>
            <span v-if="props.isRepayment">返済メモ</span>
            <span v-else>支払メモ</span>
            <textarea v-model="vmDescription" :placeholder="props.isRepayment ? '返済についての説明を入力...' : '支払いについての説明を入力...'"></textarea>
          </label>

          <div class="row-2">
            <label>
              <span v-if="props.isRepayment">返済者</span>
              <span v-else>支払者</span>
              <select v-model="vmPayer">
                <option :value="0" disabled>選択</option>
                <option v-for="m in groupStore.g.members" :key="m.id" :value="m.id">
                  {{ m.banner }}
                </option>
              </select>
            </label>
            <label>
              <span>金額（または計算式）</span>
              <input v-model="vmAmountExpression" type="text" placeholder="1200+850*2" />
              <small v-if="nowCalculatedAmount.isOK"> 計算結果: <CurrencyRibbon :value="nowCalculatedAmount.amount * vmExchangeRate" /> </small>
              <small v-else> 計算結果: {{ nowCalculatedAmount.message }} </small>
            </label>
          </div>

          <div class="row-2" v-if="props.isRepayment">
             <label>
              <span v-if="props.isRepayment">受け取り者</span>
              <span v-else>支払者</span>
              <select v-model="vmReceiver">
                <option :value="0" disabled>選択</option>
                <option v-for="m in groupStore.g.members" :key="m.id" :value="m.id">
                  {{ m.banner }}
                </option>
              </select>
            </label>
          </div>

          <div class="row-2" v-else>
            <label>
              <span>受取者（個人指定）</span>
              <select v-model="vmPayeeMembers" multiple>
                <option :value="0">全員を対象にする</option>
                <option v-for="m in groupStore.g.members" :key="m.id" :value="m.id">
                  {{ m.banner }}
                </option>
              </select>
            </label>
            <label>
              <span>受取者（サブグループ指定）</span>
              <select v-model="vmPayeeGroups" multiple>
                <option v-for="sg in groupStore.g.subGroups" :key="sg.id" :value="sg.id">
                  {{ sg.name }}
                </option>
              </select>
            </label>
          </div>

          <div class="payee-member-actions" v-if="!props.isRepayment">
            <button
              @click="
                vmPayeeMembers = [0];
                vmPayeeGroups = [];
              "
            >
              全員を対象にする
            </button>
            <button @click="vmPayeeMembers = []">対象（個人）をリセット</button>
            <button @click="vmPayeeGroups = []">対象（サブグループ）をリセット</button>
          </div>

          <div v-if="!props.isRepayment">
            <h2>選択中のメンバー</h2>
            <div v-if="nowPayees.members.length === 0" class="empty">
              <p>選択されていません</p>
            </div>
            <ul v-else class="member-chip-wrapper">
              <MemberChip v-for="m in nowPayees.members" :key="m.id" :banner="m.banner" />
            </ul>
          </div>
        </section>

        <details>
          <summary>詳細設定</summary>

          <div class="content">
            <div class="row-2">
              <label>
                <span v-if="props.isRepayment">返済通貨</span>
                <span v-else>入力通貨</span>
                <CurrencySelector v-model="vmInputCurrency" />
              </label>
              <label>
                <span>為替レート</span>
                <input v-model="vmExchangeRate" type="number" min="0.001" step="0.001" />
                <small>1 {{ vmInputCurrency.code }} = {{ vmExchangeRate }} {{ groupStore.g.currency.code }}</small>
              </label>
            </div>

            <div class="row-2">
              <label>
                <span v-if="props.isRepayment">返済日時</span>
                <span v-else>支払日時</span>
                <DateTimeSelector v-model="vmPaidAt" :time-offset="groupStore.g.timeOffset" />
              </label>
            </div>
          </div>
        </details>
      </main>

      <footer>
        <button @click="router.back()">
          <span v-if="!props.inNewMode">更新</span>
          <span v-else>追加</span>
          <span>せずにホームに戻る</span>
        </button>
        <button @click="submit">
          <span v-if="props.inNewMode">追加</span>
          <span v-else>更新</span>
        </button>
      </footer>
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

main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

section {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;

  @include var.narrow() {
    grid-template-columns: 1fr;
  }
}

.payee-member-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  button {
    border: none;
    border-radius: var(--border-radius);
    background-color: var(--bg-2);
    color: var(--text-0);
    padding: 0.3rem 0.6rem;
    cursor: pointer;

    &:hover {
      background-color: var(--bg-3);
    }
  }
}

.member-chip-wrapper {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

select[multiple] {
  min-height: 7rem;
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
</style>
