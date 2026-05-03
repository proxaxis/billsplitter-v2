import { ref, computed, watch, nextTick } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from '@/stores/user';
import { usePaymentStore } from '@/stores/payment';
import { toSafeString, request } from '@/utils/fetch';
import toast from '@/utils/toast';

export const useGroupStore = defineStore('group', () => {
  const userStore = useUserStore();
  const paymentStore = usePaymentStore();

  /** @type {string} グループID */
  const id = ref('');

  const data = ref({
    /** @type {string} グループ名 */
    name: '',
    /** @type {string} グループ説明 */
    description: '',
    /** @type {string} グループアイコン */
    icon: '',
    /** @type {{ uid: string|null, id: number, name: string, icon: string }[]} グループメンバー */
    members: [],
    /** @type {{ id: number, name: string, members: number[] }[]} サブグループ */
    subGroups: [],
    /** @type {{ id: number, name: string }[]} カテゴリ */
    categories: [],
    /** @type {string} 表示通貨 */
    currency: 'JPY',
    /** @type {string} タイムゾーン */
    timezone: 'Asia/Tokyo',
    /** @type {string} 開始日時 */
    startAt: '1970-01-01T00:00:00Z',
    /** @type {string} 終了日時 */
    endAt: '1970-01-01T00:00:00Z',
    /** @type {string} 作成日時 */
    createdAt: '1970-01-01T00:00:00Z',
    /** @type {string} 更新日時 */
    updatedAt: '1970-01-01T00:00:00Z',
  });

  const g = computed(() => {
    return {
      ...data.value,
      currency: {
        code: data.value.currency,
        name: new Intl.DisplayNames([userStore.locale], { type: 'currency' }).of(data.value.currency),
        symbol: new Intl.NumberFormat(userStore.locale, {
          style: 'currency',
          currency: data.value.currency,
        })
          .formatToParts(0)
          .find((p) => p.type === 'currency')?.value || data.value.currency,
      },
      members: data.value.members.map((m) => ({ ...m, banner: m.icon + m.name })),
      timeDisplay: {
        created: new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.expression,
          timeZone: data.value.timezone,
        }).format(new Date(data.value.createdAt)),
        updated: new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.expression,
          timeZone: data.value.timezone,
        }).format(new Date(data.value.updatedAt)),
        start: (data.value.startAt) ? new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.short,
          timeZone: data.value.timezone,
        }).format(new Date(data.value.startAt)) : null,
        end: (data.value.endAt) ? new Intl.DateTimeFormat(userStore.locale, {
          ...userStore.time.short,
          timeZone: data.value.timezone,
        }).format(new Date(data.value.endAt)) : null,
        offset: new Intl.DateTimeFormat(userStore.locale, {
          timeZone: data.value.timezone,
          timeZoneName: 'shortOffset'
        }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || '',
      },
      currencyDisplay: ((code) => {
        const name = new Intl.DisplayNames([userStore.locale], { type: 'currency' }).of(code);
        const symbol = new Intl.NumberFormat(userStore.locale, {
            style: 'currency',
            currency: code,
          })
            .formatToParts(0)
            .find((p) => p.type === 'currency')?.value || code;
        return { code, name, symbol };
      })(data.value.currency),
    };
  });

  function getMemberById(mmId) {
    // console.trace('getMemberById', mmId, data.value.members);
    const member = data.value.members.find((m) => m.id === mmId) ?? { uid: null, id: mmId, name: 'Unknown', icon: '🫥' };
    member.banner = member.icon + member.name;
    return member;
  }

  function getSubGroupById(sgId) {
    return (
      data.value.subGroups.find((sg) => sg.id === sgId) || {
        id: sgId,
        name: 'Unknown Subgroup',
        icon: '🫥',
        members: [],
      }
    );
  }

  function getCategoryById(ctId) {
    return data.value.categories.find((c) => c.id === ctId) || { id: ctId, name: 'Unknown Category' };
  }

  async function _fetchGroupInfo(grpId) {
    const d = await request(`/g/${toSafeString(grpId)}/info`);
    data.value.name = d.name;
    data.value.description = d.description;
    data.value.icon = d.icon;
    data.value.members = d.members;
    data.value.subGroups = d.sub_groups;
    data.value.categories = d.categories;
    data.value.currency = d.currency;
    data.value.timezone = d.timezone;
    data.value.startAt = d.start_at;
    data.value.endAt = d.end_at;
    data.value.createdAt = d.created_at;
    data.value.updatedAt = d.updated_at;
    return d;
  }

  const init = (grpId) => new Promise(async (resolve, reject) => {
    grpId = toSafeString(grpId).trim();
    if (grpId === '' || grpId === undefined || grpId === null) {
      resolve();
      return;
    }
    id.value = grpId;
    try {
      userStore.isLoading = true;
      const res = await _fetchGroupInfo(grpId);
      console.log('Group info loaded', res);
      paymentStore.page = 1;
      await paymentStore.fetchPaymentsData(grpId, 1);
      resolve();
    } catch (error) {
      console.error(error);
      reject(error);
    } finally {
      userStore.isLoading = false;
    }
  });

  return {
    id,
    g,
    getMemberById,
    getSubGroupById,
    getCategoryById,
    init,
  };
});
