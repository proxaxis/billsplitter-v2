import { ref, watch, computed } from 'vue';
import { defineStore } from 'pinia';
import { useGroupStore } from '@/stores/group';
import { useUserStore } from '@/stores/user';
import { request, toSafeString } from '@/utils/fetch';

export const usePaymentStore = defineStore('payment', () => {
  const groupStore = useGroupStore();
  const userStore = useUserStore();

  /** @type {number} 現在のページ */
  const page = ref(1);

  /**
   * @typedef {Object} Payment
   * @property {number} id
   * @property {string} name
   * @property {string} description
   * @property {number} amount
   * @property {number} payer
   * @property {number[]} payees
   * @property {string} paidAt
   * @property {string} createdAt
   * @property {string} currency
   * @property {number} exchangeRate
   * @property {string} type
   */
  /** @type {Payment[]} */
  const data = ref([]);

  const p = computed(() => {
    if (data.value.length === 0) return [];
    return data.value.map((d, index) => ({
      _index: index,
      ...d,
      isOK: true,
      id: Number(d.id),
      currency: {
        code: d.currency,
        name: new Intl.DisplayNames([userStore.locale], { type: 'currency' }).of(d.currency),
        symbol:
          new Intl.NumberFormat(userStore.locale, {
            style: 'currency',
            currency: d.currency,
          })
            .formatToParts(0)
            .find((p) => p.type === 'currency')?.value || d.currency,
      },
      timeDisplay: {
        paid: new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.expression,
          timeZone: groupStore.g.timezone,
        }).format(new Date(d.paidAt)),
        created: new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.expression,
          timeZone: groupStore.g.timezone,
        }).format(new Date(d.createdAt)),
      },
      total: d.amount * d.exchangeRate,
    }));
  });

  const balance = computed(() => {
    const balanceMap = new Map();

    if (groupStore.g.members.length === 0) return balanceMap;

    // グループのメンバーを初期化して、支払額と消費額を 0 に設定
    groupStore.g.members.forEach((m) => {
      balanceMap.set(m.id, { id: m.id, paid: 0, balance: 0, consumption: 0 });
    });

    // 支払い情報をもとに、支払額と消費額を計算
    p.value.forEach((pm) => {
      if (pm.total === 0 || !pm.isOK || pm.type !== 'payment') return;

      const payer = balanceMap.get(pm.payer);
      if (!payer) return;

      const payees = pm.payees;
      if (payees.length === 0) return;

      payer.paid += pm.amount;
      payer.balance += pm.amount;

      const baseDebt = Math.floor(pm.amount / payees.length);
      let remainder = pm.amount - baseDebt * payees.length;

      payees.forEach((e) => {
        const cost = baseDebt + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        const debtor = balanceMap.get(e);
        if (!debtor) return;
        debtor.balance -= cost;
        debtor.consumption += cost;
      });
    });

    return balanceMap;
  });

  const transactions = computed(() => {
    // 支払いの総額を計算
    const players = Array.from(balance.value.values()).map((p) => ({
      ...p,
      balance: Math.round(p.balance),
    }));
    if (players.length === 0) return [];

    // 支払いの総額がゼロの場合は、取引もゼロ
    const arr = [];
    while (true) {
      // 毎回最新の最大支払者と最大未払者を見つける
      players.sort((a, b) => b.balance - a.balance);
      const tooMuchPlayer = players[0];
      const lessPlayer = players[players.length - 1];

      if (tooMuchPlayer.balance <= 0 && lessPlayer.balance >= 0) break;

      const amount = Math.min(tooMuchPlayer.balance, Math.abs(lessPlayer.balance));
      if (amount === 0) break;

      arr.push({
        sender: lessPlayer.id,
        receiver: tooMuchPlayer.id,
        amount,
      });

      tooMuchPlayer.balance -= amount;
      lessPlayer.balance += amount;
    }

    p.value.filter((pm) => pm.isOK && pm.type === 'repayment').forEach((pm) => {
      // 返済は支払いと逆の処理をするが、返済されすぎている人がいる可能性もあることを考慮して、支払者と受取人を逆にして同様の処理をする
      const sender = arr.find((t) => t.sender === pm.payer && t.receiver === pm.payees[0]);
      if (sender) {
        const diff = sender.amount - pm.total;
        if (diff <= 0) {
          const index = arr.findIndex((t) => t === sender);
          if (index !== -1) arr.splice(index, 1);
          arr.push({
            sender: pm.payees[0],
            receiver: pm.payer,
            amount: Math.abs(diff),
          });
        }
      } else {
        arr.push({
          sender: pm.payees[0],
          receiver: pm.payer,
          amount: pm.total,
        });
      }
    });

    return arr;
  });
  
  async function fetchPaymentsData(grpId = groupStore.id, pageNum = page.value) {
    try {
      const d = await request(`/g/${toSafeString(grpId)}/payments/${toSafeString(pageNum)}`);
      data.value = d.payments.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        amount: r.amount,
        payer: r.payer,
        payees: r.payees,
        paidAt: r.paid_at,
        createdAt: r.created_at,
        currency: r.currency,
        exchangeRate: r.exchange_rate,
        type: r.type,
      }));
    } catch (error) {
      console.error('Failed to fetch payments data:', error);
      data.value = [];
    }
  }

  function getPaymentById(pmId) {
    pmId = Number(pmId);
    const now = new Date();
    const resolved = data.value.find((pm) => pm.id === pmId) || {
      isOK: false,
      id: pmId,
      name: 'Unknown Payment',
      description: '',
      amount: 0,
      payer: 0,
      payees: [],
      currency: 'JPY',
      exchangeRate: 0,
      type: 'error',
      paidAt: now.toISOString(),
      createdAt: now.toISOString(),
      total: 0,
    };

    return {
      ...resolved,
      currency: {
        code: resolved.currency,
        name: new Intl.DisplayNames([userStore.locale], { type: 'currency' }).of(resolved.currency),
        symbol:
          new Intl.NumberFormat(userStore.locale, {
            style: 'currency',
            currency: resolved.currency,
          })
            .formatToParts(0)
            .find((p) => p.type === 'currency')?.value || resolved.currency,
      },
      timeDisplay: {
        paid: new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.expression,
          timeZone: groupStore.g.timezone,
        }).format(new Date(resolved.paidAt)),
        created: new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.expression,
          timeZone: groupStore.g.timezone,
        }).format(new Date(resolved.createdAt)),
      },
      total: resolved.amount * resolved.exchangeRate,
    };
  }

  async function addPayment(pm) {
    data.value.push({
      id: pm.id,
      name: pm.name,
      description: pm.description,
      amount: pm.amount,
      paidAt: pm.paid_at,
      currency: pm.currency,
      exchangeRate: pm.exchange_rate,
      type: pm.type,
      payer: pm.payer,
      payees: pm.payees,
      createdAt: pm.created_at,
    });
  }

  async function updatePayment(pm) {
    const index = p.value.findIndex((x) => x.id === Number(pm.id));
    if (index !== -1) {
      data.value.splice(index, 1, {
        id: pm.id,
        name: pm.name,
        description: pm.description,
        amount: pm.amount,
        paidAt: pm.paid_at,
        currency: pm.currency,
        exchangeRate: pm.exchange_rate,
        type: pm.type,
        payer: pm.payer,
        payees: pm.payees,
        createdAt: pm.created_at,
      });
    }
  }

  async function deletePayment(pmId) {
    await request(`/g/${toSafeString(groupStore.id)}/${toSafeString(pmId)}`, {
      method: 'DELETE',
    });
    const index = p.value.findIndex((pm) => pm.id === Number(pmId));
    if (index !== -1) {
      data.value.splice(index, 1);
    }
  }

  return {
    page,
    p,
    balance,
    transactions,
    fetchPaymentsData,
    addPayment,
    getPaymentById,
    updatePayment,
    deletePayment,
  };
});
