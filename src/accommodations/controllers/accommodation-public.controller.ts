import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccommodationUC } from '../useCases/accommodationUC.uc';

@Controller('accommodation/public')
@ApiTags('Hospedajes Público')
export class AccommodationPublicController {
  constructor(private readonly _accommodationUC: AccommodationUC) {}

  @Get('most-requested')
  @ApiOperation({
    summary: 'Obtiene los 2 hospedajes más solicitados (acceso público)',
  })
  @ApiOkResponse({ description: 'Lista de los 2 hospedajes más solicitados' })
  async getMostRequested() {
    const data = await this._accommodationUC.getMostRequested();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }
}
