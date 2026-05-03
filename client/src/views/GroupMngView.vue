<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGroupStore } from '@/stores/group';
import { useUserStore } from '@/stores/user';
import { request, toSafeString } from '@/utils/fetch';
import EmojiSelector from '@/components/EmojiSelector.vue';
import DateSelector from '@/components/DateSelector.vue';
import TimeZoneSelector from '@/components/TimeZoneSelector.vue';
import CurrencySelector from '@/components/CurrencySelector.vue';
import CurrencyRibbon from '@/components/CurrencyRibbon.vue';
import IconXmark from '@/components/icons/IconXmark.vue';
import IconHouse from '@/components/icons/IconHouse.vue';
import AppHeader from '@/components/AppHeader.vue';
import DateTimeRibbon from '@/components/DateTimeRibbon.vue';
import toast from '@/utils/toast';
import dialog from '@/utils/dialog';

const router = useRouter();
const route = useRoute();
const groupStore = useGroupStore();
const userStore = useUserStore();

const props = defineProps({
  inNewMode: {
    type: Boolean,
    default: true,
  },
});

const vmGroupName = ref('');
const vmNewMemberName = ref('');
const vmStartDate = ref(null);
const vmEndDate = ref(null);
const vmGroupDescription = ref('');
const vmGroupIcon = ref('');
const vmCurrency = ref({ code: 'JPY', name: '日本円', symbol: '¥' });
const vmTimeZone = ref('Asia/Tokyo');
/** @type {{ id: number|null, name: string, icon: string, isNew: boolean }[]} */
const vmMembers = ref([]);
const editingMemberIndex = ref(null);
const editingMemberName = ref('');



const grpId = computed(() => toSafeString(route.params.grpId));
const isMembersDirty = computed(() => {
  if (!groupStore.g) return false;
  if (vmMembers.value.length !== groupStore.g.members.length) return true;

  for (const m of groupStore.g.members) {
    const vm = vmMembers.value.find((vm) => vm.id === m.id);
    if (!vm || vm.name !== m.name || vm.icon !== m.icon) {
      return true;
    }
  }
  return false;
});


// メンバー管理メソッド
function changeMemberIcon(index, newIcon) {
  vmMembers.value[index].icon = newIcon;
}

function addMember() {
  const name = vmNewMemberName.value.trim();
  if (name) {
    vmMembers.value.push({ id: null, name, icon: '', isNew: true });
    vmNewMemberName.value = '';
  }
}

function removeMember(index) {
  vmMembers.value.splice(index, 1);
}

function startEditMemberName(index) {
  editingMemberIndex.value = index;
  editingMemberName.value = vmMembers.value[index]?.name ?? '';
}

function finishEditMemberName() {
  if (editingMemberIndex.value === null) return;

  const index = editingMemberIndex.value;
  const trimmed = editingMemberName.value.trim();
  if (trimmed) {
    vmMembers.value[index].name = trimmed;
  }

  editingMemberIndex.value = null;
  editingMemberName.value = '';
}


async function submit() {
  // バリデーション
  if (!vmGroupName.value.trim()) {
    toast.alert('グループの名前を入力してください');
    return;
  }

  if (vmMembers.value.length === 0) {
    toast.alert('メンバーを1人以上追加してください');
    return;
  }

  if (vmStartDate.value && vmEndDate.value && vmStartDate.value > vmEndDate.value) {
    toast.alert('開始日は終了日より前の日付を選択してください');
    return;
  }

  if (!props.inNewMode && isMembersDirty.value) {
    // メンバーに変更がある場合は、確認ダイアログを表示してから保存する
    const confirmed = await dialog.confirm(`
      メンバーを変更しました!\n
      追加されたメンバーは、これまでの記録には影響を与えず、これからいる者として計算されます\n
      よろしいですか?
    `);
    if (!confirmed) return;
  }

  userStore.isLoading = true;

  try {
    // グループの新規作成
    if (props.inNewMode) {
      const response = await request('/g/new', {
        method: 'POST',
        body: {
          name: vmGroupName.value.trim(),
          description: vmGroupDescription.value.trim(),
          icon: vmGroupIcon.value,
          currency: vmCurrency.value.code,
          timezone: vmTimeZone.value,
          start_at: vmStartDate.value || null,
          end_at: vmEndDate.value || null,
          members: vmMembers.value,
        },
      });
      router.push({ name: 'GroupHome', params: { grpId: response?.id } });
    }
    // グループの更新
    else {
      const basic = {
        name: vmGroupName.value.trim(),
        description: vmGroupDescription.value.trim(),
        icon: vmGroupIcon.value,
        currency: vmCurrency.value.code,
        timezone: vmTimeZone.value,
        start_at: vmStartDate.value || null,
        end_at: vmEndDate.value || null,
      };
      const members = (() => {
        // id が null のメンバーは新規追加
        const add = vmMembers.value.filter((m) => m.id === null).map((m) => ({ name: m.name, icon: m.icon }));
        // id が null でないメンバーは更新
        const rename = vmMembers.value.filter((m) => m.id !== null).map((m) => ({ id: m.id, name: m.name, icon: m.icon }));
        // オリジナルと比べて、id が存在していたのに消えているメンバーは削除
        const remove = groupStore.g.members.filter((m) => !vmMembers.value.some((vm) => vm.id === m.id)).map((m) => m.id);
        return { add, rename, remove };
      })();

      const response1 = await request(`/g/${route.params.grpId}/basic`, {
        method: 'PATCH',
        body: basic,
      });

      const response2 = await request(`/g/${route.params.grpId}/members`, {
        method: 'PATCH',
        body: members,
      });
      router.push({ name: 'GroupHome', params: { grpId: grpId.value } });
    }
  } catch (error) {
    console.error(error);
    toast.alert('グループの保存に失敗しました');
    return;
  } finally {
    userStore.isLoading = false;
  }
}

async function submitCategoriesAndSubGroups() {
  userStore.isLoading = true;

  try {
    // カテゴリの更新
    if (isCategoriesDirty.value) {
      const categories = (() => {
        const add = vmCategories.value.filter((c) => c.id === null).map((c) => ({ name: c.name }));
        const rename = vmCategories.value.filter((c) => c.id !== null).map((c) => ({ id: c.id, name: c.name }));
        const remove = (groupStore.g?.categories || []).filter((c) => !vmCategories.value.some((vc) => vc.id === c.id)).map((c) => c.id);
        return { add, rename, remove };
      })();

      if (categories.add.length > 0 || categories.rename.length > 0 || categories.remove.length > 0) {
        await request(`/g/${route.params.grpId}/categories`, {
          method: 'PATCH',
          body: categories,
        });
      }
    }

    // サブグループの更新
    if (isSubGroupsDirty.value) {
      const subGroups = (() => {
        const add = vmSubGroups.value.filter((sg) => sg.id === null).map((sg) => ({ name: sg.name, members: sg.members }));
        const names = vmSubGroups.value.filter((sg) => sg.id !== null).map((sg) => ({ id: sg.id, name: sg.name }));
        const members = vmSubGroups.value.filter((sg) => sg.id !== null && sg.members).map((sg) => ({ id: sg.id, members: sg.members }));
        const remove = (groupStore.g?.sub_groups || []).filter((sg) => !vmSubGroups.value.some((vsg) => vsg.id === sg.id)).map((sg) => sg.id);
        return { add, names, members, remove };
      })();

      if (subGroups.add.length > 0 || subGroups.names.length > 0 || subGroups.members.length > 0 || subGroups.remove.length > 0) {
        await request(`/g/${route.params.grpId}/sub-groups`, {
          method: 'PATCH',
          body: subGroups,
        });
      }
    }

    toast.alert('カテゴリとサブグループを保存しました');
  } catch (error) {
    console.error(error);
    toast.alert('カテゴリとサブグループの保存に失敗しました');
  } finally {
    userStore.isLoading = false;
  }
}

onMounted(async () => {
  if (props.inNewMode) return;

  await groupStore.init(grpId.value);
  vmGroupName.value = groupStore.g.name;
  vmStartDate.value = groupStore.g.startAt ?? '';
  vmEndDate.value = groupStore.g.endAt ?? '';
  vmMembers.value = groupStore.g.members.map((m) => ({ id: m.id, name: m.name, icon: m.icon, isNew: false }));
  vmGroupDescription.value = groupStore.g.description;
  vmGroupIcon.value = groupStore.g.icon;
  vmCurrency.value = groupStore.g.currency;
  vmTimeZone.value = groupStore.g.timezone;
  vmCategories.value = (groupStore.g.categories || []).map((c) => ({ id: c.id, name: c.name, isNew: false }));
  vmSubGroups.value = (groupStore.g.sub_groups || []).map((sg) => ({ id: sg.id, name: sg.name, members: [...sg.members], isNew: false }));
});
</script>

<template>
  <div class="views group-mng-view">
    <AppHeader>
      <li v-if="!props.inNewMode">
        <button @click="router.push({ name: 'GroupHome', params: { grpId } })" title="グループ設定">
          <IconHouse size="2.2rem" />
        </button>
      </li>
    </AppHeader>

    <main class="app-content">
      <header class="hero">
        <h1>
          <span v-if="props.inNewMode">新しいグループを作成</span>
          <span v-else>グループを編集</span>
        </h1>
        <p>
          <span v-if="props.inNewMode">新しいグループを作成します</span>
          <span v-else>このグループの情報を編集します</span>
        </p>
      </header>

      <main>
        <section class="basic-settings">
          <label class="grpname-input-section" for="grp-name">
            <span v-if="props.inNewMode">作成するグループの名前</span>
            <span v-else>グループの名前</span>
            <div>
              <input type="text" id="grp-name" v-model="vmGroupName" placeholder="沖縄旅行" />
              <EmojiSelector v-model="vmGroupIcon" placeholder="" />
            </div>
          </label>

          <label class="member-input-section" for="mem-name">
            <span>追加するメンバーの名前</span>
            <div>
              <input
                type="text"
                id="mem-name"
                v-model="vmNewMemberName"
                @keydown.enter.prevent="addMember"
                placeholder="名前を入力して 追加ボタン または Enter を押す"
              />
              <button type="button" @click="addMember" class="btn-add-member">追加</button>
            </div>
          </label>

          <div class="members-section">
            <h2>メンバー</h2>
            <div v-if="vmMembers.length === 0" class="empty">
              <p>メンバーを追加してください</p>
            </div>
            <ul v-else class="members-list">
              <li v-for="(m, i) in vmMembers" :key="i" class="member-item">
                <EmojiSelector v-model="vmMembers[i].icon" placeholder="" @change="changeMemberIcon(i, $event)" />
                <input
                  v-if="editingMemberIndex === i"
                  v-model="editingMemberName"
                  type="text"
                  class="member-name-input"
                  @blur="finishEditMemberName"
                  @keydown.enter.prevent="finishEditMemberName"
                  @keydown.esc.prevent="editingMemberIndex = null"
                />
                <span v-else class="member-name" @click="startEditMemberName(i)">{{ m.name }}</span>
                <button type="button" @click="removeMember(i)" class="btn-remove delete" :disabled="!m.isNew">
                  <IconXmark size="1rem" />
                </button>
              </li>
            </ul>
          </div>
        </section>

        <section class="advanced-settings">
          <details>
            <summary>詳しい設定</summary>
            <div class="content">
              <label>
                <span>グループの説明</span>
                <textarea v-model="vmGroupDescription" placeholder="このグループについて説明を入力..."></textarea>
              </label>

              <div class="two-column-row">
                <label>
                  <span>表示通貨</span>
                  <CurrencySelector v-model="vmCurrency" />
                  <small><CurrencyRibbon :value="1000" :currency="vmCurrency?.code" /></small>
                </label>

                <label>
                  <span>タイムゾーン</span>
                  <TimeZoneSelector v-model="vmTimeZone" />
                  <small>現在の時刻: <DateTimeRibbon :tz="vmTimeZone" /></small>
                </label>
              </div>

              <div class="two-column-row">
                <label>
                  <span>予定の開始日</span>
                  <DateSelector v-model="vmStartDate" :timezone="vmTimeZone" />
                </label>
                <label>
                  <span>予定の終了日</span>
                  <DateSelector v-model="vmEndDate" :min="vmStartDate" :timezone="vmTimeZone" />
                </label>
              </div>
            </div>
          </details>
        </section>
      </main>
      <footer>
        <button v-if="!props.inNewMode" @click="router.push({ name: 'GroupHome', params: { grpId }})">変更を保存せずにホームに戻る</button>
        <button v-if="!props.inNewMode && (isCategoriesDirty || isSubGroupsDirty)" @click="submitCategoriesAndSubGroups">
          カテゴリとサブグループを保存
        </button>
        <button @click="submit">
          <span v-if="props.inNewMode">グループを作成</span>
          <span v-else>変更を保存</span>
        </button>
      </footer>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as var;

main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

section {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 1rem;
  background-color: var(--bg-0);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;

  & > span {
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--text-0);
  }

  input {
    display: block;
    height: 100%;
  }
}

// 基本設定セクション
.basic-settings {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.member-input-section,
.grpname-input-section {
  display: flex;
  flex-direction: column;

  & > div {
    display: flex;
    gap: 0.4rem;

    input {
      flex-grow: 1;
    }
  }

  // ボタン スタイル
  .btn-add-member {
    padding: 0 1.2rem;
    border: 1px solid var(--primary);
    border-radius: 6px;
    background-color: var(--primary);
    color: white;
    @include var.buttonAnimation();
  }
}

.members-section {
  border-top: 1px solid var(--border);
}

.members-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.8rem;
  padding: 0;
  margin: 0.8rem 0 0 0;
  list-style: none;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  gap: 0.5rem;
  transition: 0.3s;
}

.member-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  cursor: text;
}

.member-name-input {
  min-width: 0;
  width: 100%;
}

// カテゴリ管理セクション
.categories-section {
  border-top: 1px solid var(--border);
  padding-top: 1.2rem;
}

.category-input-section {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.8rem;

  input {
    flex-grow: 1;
  }

  .btn-add-category {
    padding: 0 1.2rem;
    border: 1px solid var(--primary);
    border-radius: 6px;
    background-color: var(--primary);
    color: white;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: 0.3s;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background-color: #0000cc;
      box-shadow: 0 2px 8px var(--shadow);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.categories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.8rem;
  padding: 0;
  margin: 0.8rem 0 0 0;
  list-style: none;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  gap: 0.5rem;
  transition: 0.3s;
}

.category-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  cursor: text;
}

.category-name-input {
  min-width: 0;
  width: 100%;
}

// サブグループ管理セクション
.subgroups-section {
  border-top: 1px solid var(--border);
  padding-top: 1.2rem;
}

.subgroup-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 0.8rem;

  & > div:first-child {
    display: flex;
    gap: 0.4rem;

    input {
      flex-grow: 1;
    }

    .btn-add-subgroup {
      padding: 0 1.2rem;
      border: 1px solid var(--primary);
      border-radius: 6px;
      background-color: var(--primary);
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: 0.3s;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background-color: #0000cc;
        box-shadow: 0 2px 8px var(--shadow);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .members-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.8rem;
    background-color: var(--bg-1);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
}

.members-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-checkbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  font-size: 0.95rem;

  input {
    cursor: pointer;
  }
}

.subgroups-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0;
  margin: 0.8rem 0 0 0;
  list-style: none;
}

.subgroup-item {
  padding: 0.8rem;
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.subgroup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.subgroup-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  cursor: text;
}

.subgroup-name-input {
  min-width: 0;
  flex-grow: 1;
}

.subgroup-members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-remove {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-0);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: 0.3s;

  &:hover:not(:disabled) {
    background-color: rgba(255, 0, 0, 0.1);
    color: red;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 詳細設定セクション
.advanced-settings {
  padding: 0;
  border: none;
  background: transparent;
}

// 2列レイアウト
.two-column-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;

  @include var.narrow() {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
}

.btn-create {
  padding: 0.8rem 2rem;
  border: 2px solid var(--primary);
  border-radius: var(--border-radius);
  background-color: var(--primary);
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: 0.3s;
  width: 100%;
  margin-top: 1rem;

  &:hover {
    background-color: var(--primary);
    box-shadow: 0 4px 12px var(--shadow);
  }

  &:active {
    transform: scale(0.98);
  }
}

.advanced-settings .content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
