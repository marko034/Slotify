import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonBadge,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, createOutline, trashOutline } from 'ionicons/icons';
import { finalize, forkJoin } from 'rxjs';
import { AdminApi } from '../../api/admin.api';
import { apiErrorMessage } from '../../core/api-error';
import { Resource, ResourceType } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-admin-resources',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonModal,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonSpinner,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/admin" /></ion-buttons>
        <ion-title>Stolovi</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="page">
        @if (loading() && items().length === 0) {
          <div class="ion-padding"><ion-spinner /></div>
        } @else if (types().length === 0) {
          <ion-text color="medium"><p class="ion-padding">Prvo dodaj vrstu stola u podešavanjima.</p></ion-text>
        } @else if (items().length === 0) {
          <ion-text color="medium"><p class="ion-padding">Još nema stolova. Dodaj prvi dugmetom +.</p></ion-text>
        }
        <ion-list>
          @for (r of items(); track r.id) {
            <ion-item>
              <ion-label>
                <h2>{{ r.name }}</h2>
                <p>{{ typeName(r.resourceTypeId) }}</p>
              </ion-label>
              @if (!r.isActive) { <ion-badge slot="end" color="medium">Neaktivan</ion-badge> }
              <ion-button slot="end" fill="clear" aria-label="Izmeni" (click)="open(r)">
                <ion-icon slot="icon-only" name="create-outline" />
              </ion-button>
              <ion-button slot="end" fill="clear" color="danger" aria-label="Obriši" (click)="remove(r)">
                <ion-icon slot="icon-only" name="trash-outline" />
              </ion-button>
            </ion-item>
          }
        </ion-list>
      </div>

      @if (types().length > 0) {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button aria-label="Novi sto" (click)="open()"><ion-icon name="add" /></ion-fab-button>
        </ion-fab>
      }

      <ion-modal [isOpen]="modalOpen()" (didDismiss)="modalOpen.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>{{ editingId() ? 'Izmena stola' : 'Novi sto' }}</ion-title>
              <ion-buttons slot="end"><ion-button (click)="modalOpen.set(false)">Zatvori</ion-button></ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="form" (ngSubmit)="submit()" class="form">
              <ion-input label="Naziv (npr. Sto 1)" labelPlacement="floating" fill="outline" formControlName="name" />
              <ion-select label="Vrsta stola" labelPlacement="floating" fill="outline" formControlName="resourceTypeId">
                @for (t of types(); track t.id) {
                  <ion-select-option [value]="t.id">{{ t.name }}</ion-select-option>
                }
              </ion-select>
              <ion-toggle formControlName="isActive">Aktivan (može da se rezerviše)</ion-toggle>
              <ion-button type="submit" expand="block" [disabled]="form.invalid || saving()">
                @if (saving()) { <ion-spinner name="dots" /> } @else { Sačuvaj }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
})
export class AdminResourcesPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  protected readonly items = signal<Resource[]>([]);
  protected readonly types = signal<ResourceType[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    resourceTypeId: ['', Validators.required],
    isActive: [true],
  });

  constructor() {
    addIcons({ add, createOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  protected typeName(id: string): string {
    return this.types().find((t) => t.id === id)?.name ?? '';
  }

  protected open(resource?: Resource): void {
    this.editingId.set(resource?.id ?? null);
    this.form.reset({
      name: resource?.name ?? '',
      resourceTypeId: resource?.resourceTypeId ?? this.types()[0]?.id ?? '',
      isActive: resource?.isActive ?? true,
    });
    this.modalOpen.set(true);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const request = { name: v.name.trim(), resourceTypeId: v.resourceTypeId, isActive: v.isActive };

    const id = this.editingId();
    const call = id ? this.api.updateResource(id, request) : this.api.createResource(request);

    this.saving.set(true);
    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.modalOpen.set(false);
        void this.toast.success('Sačuvano.');
        this.load();
      },
      error: (e) => void this.toast.error(apiErrorMessage(e)),
    });
  }

  protected async remove(r: Resource): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Obriši sto?',
      message: `${r.name}. Ako sto ima rezervacije, deaktiviraj ga umesto brisanja.`,
      buttons: [
        { text: 'Ne', role: 'cancel' },
        {
          text: 'Obriši',
          role: 'destructive',
          handler: () =>
            this.api.deleteResource(r.id).subscribe({
              next: () => {
                void this.toast.success('Obrisano.');
                this.load();
              },
              error: (e) => void this.toast.error(apiErrorMessage(e)),
            }),
        },
      ],
    });
    await alert.present();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({ resources: this.api.listResources(), types: this.api.listTypes() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ resources, types }) => {
          this.items.set(resources);
          this.types.set(types);
        },
        error: (e) => void this.toast.error(apiErrorMessage(e)),
      });
  }
}